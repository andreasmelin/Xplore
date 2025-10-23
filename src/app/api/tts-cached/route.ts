export const runtime = "edge";

import { getCachedContent, storeCachedContent } from "@/lib/cache/content-cache";
import { consumeQuota, QUOTA_COSTS } from "@/lib/quota-manager";
import { parseCookies } from "@/lib/auth/cookies";

type TtsBody = {
  text?: string;
  voice?: string;
  format?: "mp3" | "opus";
  provider?: "openai" | "elevenlabs";
  // Cache params
  topicId?: string;
  lessonId?: string;
  contentIndex?: number;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as TtsBody;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voice = typeof body.voice === "string" && body.voice.trim() ? body.voice.trim() : "alloy";
  const format = body.format === "opus" ? "opus" : "mp3";
  const provider = body.provider === "elevenlabs" ? "elevenlabs" : "openai";
  
  // Cache parameters
  const topicId = body.topicId;
  const lessonId = body.lessonId;
  const contentIndex = body.contentIndex;

  if (!text) return Response.json({ error: "Text required" }, { status: 400 });

  // Get user ID for quota tracking
  const cookies = parseCookies(req.headers.get("cookie"));
  const userId = cookies["x_user_id"];

  // Check cache if we have cache params
  if (topicId && lessonId && typeof contentIndex === "number") {
    try {
      const cached = await getCachedContent("audio", topicId, lessonId, contentIndex, text);
      
      if (cached) {
        console.log(`[TTS] Cache HIT: ${cached.cache_key} (no quota consumed)`);
        return Response.json({ 
          audioUrl: cached.public_url,
          cached: true,
          cacheKey: cached.cache_key,
          quotaConsumed: 0,
        });
      }
      
      console.log(`[TTS] Cache MISS: Generating new audio (will consume quota)`);
    } catch (error) {
      console.error("[TTS] Cache check error:", error);
      // Continue to generation if cache check fails
    }
  }

  // Consume quota for generation (only if not cached)
  if (userId) {
    const quotaResult = await consumeQuota(userId, QUOTA_COSTS.tts, "tts", {
      provider,
      cached: false,
      textLength: text.length,
    });
    
    if (!quotaResult.success) {
      return Response.json({ 
        error: "Daily quota exceeded. Please try again tomorrow.",
        remaining: quotaResult.remaining 
      }, { status: 429 });
    }
  }

  // Generate audio (existing logic)
  let audioBuffer: ArrayBuffer;
  let mimeType: string;

  if (provider === "elevenlabs") {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return Response.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 });

    // TypeScript now knows apiKey is defined
    const validApiKey: string = apiKey;
    const defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || "4xkUqaR9MYOJHoaC1Nak";
    const modelId = process.env.ELEVENLABS_MODEL_ID || undefined;
    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(defaultVoiceId)}`;

    async function elevenFetchOnce() {
      return fetch(endpoint, {
        method: "POST",
        headers: new Headers({
          "xi-api-key": validApiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        }),
        body: JSON.stringify({
          text,
          ...(modelId ? { model_id: modelId } : {}),
        }),
      });
    }

    let res = await elevenFetchOnce();
    if (!res.ok && res.status !== 401 && res.status !== 403) {
      await new Promise((r) => setTimeout(r, 1000));
      res = await elevenFetchOnce();
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const message =
        res.status === 401 || res.status === 403
          ? "ElevenLabs auth failed: check ELEVENLABS_API_KEY"
          : errText || `Upstream ${res.status}`;
      const status = res.status >= 500 ? 502 : 400;
      return Response.json({ error: message }, { status });
    }

    audioBuffer = await res.arrayBuffer();
    mimeType = "audio/mpeg";
  } else {
    // OpenAI TTS
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });

    const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input: text,
        voice,
        response_format: format,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      return Response.json({ error: errText || `Upstream ${upstream.status}` }, { status: 400 });
    }

    audioBuffer = await upstream.arrayBuffer();
    mimeType = format === "opus" ? "audio/opus" : "audio/mpeg";
  }

  // Store in cache if we have cache params
  if (topicId && lessonId && typeof contentIndex === "number") {
    try {
      const blob = new Blob([audioBuffer], { type: mimeType });
      const cached = await storeCachedContent(
        "audio",
        topicId,
        lessonId,
        contentIndex,
        text,
        blob,
        {
          provider,
          generationParams: { voice, format, provider },
          mimeType,
        }
      );

      if (cached) {
        console.log(`[TTS] Cached: ${cached.cache_key}`);
        return Response.json({ 
          audioUrl: cached.public_url,
          cached: false,
          cacheKey: cached.cache_key,
          quotaConsumed: QUOTA_COSTS.tts,
        });
      }
    } catch (error) {
      console.error("[TTS] Cache store error:", error);
      // Continue to return audio even if caching fails
    }
  }

  // Return audio directly if no caching or caching failed
  return new Response(audioBuffer, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

