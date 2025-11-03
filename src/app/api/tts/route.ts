export const runtime = "edge";

type TtsBody = {
  text?: string;
  voice?: string;
  format?: "mp3" | "opus";
  provider?: "openai" | "elevenlabs";
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as TtsBody;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voice = typeof body.voice === "string" && body.voice.trim() ? body.voice.trim() : "alloy";
  const format = body.format === "opus" ? "opus" : "mp3";
  const provider = body.provider === "elevenlabs" ? "elevenlabs" : "openai";
  if (!text) return Response.json({ error: "Text required" }, { status: 400 });

  if (provider === "elevenlabs") {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    console.log("[TTS API] ELEVENLABS_API_KEY exists:", !!apiKey);
    console.log("[TTS API] API key length:", apiKey?.length || 0);
    console.log("[TTS API] API key first 10 chars:", apiKey?.substring(0, 10) || "N/A");
    if (!apiKey) return Response.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 });
    const xiKey: string = apiKey;

    // ElevenLabs v1 text-to-speech: POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
    // If a voice name is provided, let the client pass a specific voice id; default to "Rachel" voice id placeholder
    const defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || "4xkUqaR9MYOJHoaC1Nak"; // User default
    const voiceId = defaultVoiceId; // Future: map names to IDs if needed
    const modelId = process.env.ELEVENLABS_MODEL_ID || undefined; // e.g., "eleven_multilingual_v2"

    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
    // Prefer MP3 for broad compatibility and fewer codec issues
    const elevenAccept = "audio/mpeg";
    async function elevenFetchOnce() {
      return fetch(endpoint, {
        method: "POST",
        headers: new Headers({
          "xi-api-key": xiKey,
          "Content-Type": "application/json",
          "Accept": elevenAccept,
        }),
        body: JSON.stringify({
          text,
          ...(modelId ? { model_id: modelId } : {}),
          // voice_settings can be added here if needed
        }),
      });
    }
    let res = await elevenFetchOnce();
    console.log("[TTS API] ElevenLabs response status:", res.status);
    if (!res.ok && res.status !== 401 && res.status !== 403) {
      await new Promise((r) => setTimeout(r, 1000));
      res = await elevenFetchOnce();
      console.log("[TTS API] ElevenLabs retry response status:", res.status);
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[TTS API] ElevenLabs error:", res.status, errText);
      const message =
        res.status === 401 || res.status === 403
          ? "ElevenLabs auth failed: check ELEVENLABS_API_KEY"
          : errText || `Upstream ${res.status}`;
      const status = res.status >= 500 ? 502 : 400;
      return Response.json({ error: message }, { status });
    }
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });

  const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice,
      response_format: format,
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    return Response.json({ error: errText || `Upstream ${upstream.status}` }, { status: 400 });
  }

  const buf = await upstream.arrayBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": format === "opus" ? "audio/opus" : "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}

// Streaming endpoint: supports ElevenLabs streaming TTS
export async function GET(req: Request) {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") === "elevenlabs" ? "elevenlabs" : "openai";
  const text = (url.searchParams.get("text") || "").trim();
  if (!text) return new Response(JSON.stringify({ error: "Text required" }), { status: 400, headers: { "Content-Type": "application/json" } });

  if (provider === "elevenlabs") {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: "Missing ELEVENLABS_API_KEY" }), { status: 500, headers: { "Content-Type": "application/json" } });
    const xiKey: string = apiKey;
    const defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || "4xkUqaR9MYOJHoaC1Nak"; // User default
    const modelId = process.env.ELEVENLABS_MODEL_ID || undefined;
    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(defaultVoiceId)}/stream`;
    async function elevenStreamOnce() {
      return fetch(endpoint, {
        method: "POST",
        headers: new Headers({
          "xi-api-key": xiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        }),
        body: JSON.stringify({ text, ...(modelId ? { model_id: modelId } : {}) }),
      });
    }
    let upstream = await elevenStreamOnce();
    if (!upstream.ok && upstream.status !== 401 && upstream.status !== 403) {
      await new Promise((r) => setTimeout(r, 1000));
      upstream = await elevenStreamOnce();
    }
    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      const message = upstream.status === 401 || upstream.status === 403 ? "ElevenLabs auth failed: check ELEVENLABS_API_KEY" : errText || `Upstream ${upstream.status}`;
      return new Response(JSON.stringify({ error: message }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(JSON.stringify({ error: "Streaming not supported for this provider" }), { status: 400, headers: { "Content-Type": "application/json" } });
}


