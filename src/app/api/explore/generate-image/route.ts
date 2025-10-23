export const runtime = "edge";

import { getCachedContent, storeCachedContent } from "@/lib/cache/content-cache";
import { consumeQuota, QUOTA_COSTS } from "@/lib/quota-manager";
import { parseCookies } from "@/lib/auth/cookies";

type RequestBody = {
  prompt?: string;
  // Cache params
  topicId?: string;
  lessonId?: string;
  contentIndex?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const topicId = body.topicId;
    const lessonId = body.lessonId;
    const contentIndex = body.contentIndex;

    if (!prompt) {
      return Response.json({ error: "Prompt required" }, { status: 400 });
    }

    // Get user ID for quota tracking
    const cookies = parseCookies(req.headers.get("cookie"));
    const userId = cookies["x_user_id"];

    // Check cache if we have cache params
    if (topicId && lessonId && typeof contentIndex === "number") {
      try {
        const cached = await getCachedContent("image", topicId, lessonId, contentIndex, prompt);
        
        if (cached) {
          console.log(`[Image] Cache HIT: ${cached.cache_key} (no quota consumed)`);
          return Response.json({ 
            imageUrl: cached.public_url,
            cached: true,
            cacheKey: cached.cache_key,
            quotaConsumed: 0,
          });
        }
        
        console.log(`[Image] Cache MISS: Generating new image (will consume quota)`);
      } catch (error) {
        console.error("[Image] Cache check error:", error);
        // Continue to generation if cache check fails
      }
    }

    // Consume quota for image generation (only if not cached)
    if (userId) {
      const quotaResult = await consumeQuota(userId, QUOTA_COSTS.image, "image", {
        prompt: prompt.substring(0, 100),
        cached: false,
      });
      
      if (!quotaResult.success) {
        return Response.json({ 
          error: "Daily quota exceeded. Images cost 3 tokens. Try again tomorrow or use cached content.",
          remaining: quotaResult.remaining 
        }, { status: 429 });
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    // Call DALL-E 3 API
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "hd",
        style: "natural",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("[DALL-E] Error:", response.status, errorText);
      return Response.json(
        { error: `Image generation failed: ${response.status}` },
        { status: response.status >= 500 ? 502 : 400 }
      );
    }

    const data = await response.json() as { data?: Array<{ url?: string }> };
    const imageUrl = data?.data?.[0]?.url;

    if (!imageUrl) {
      return Response.json({ error: "No image URL in response" }, { status: 500 });
    }

    // Store in cache if we have cache params
    if (topicId && lessonId && typeof contentIndex === "number") {
      try {
        // Fetch the generated image
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          
          const cached = await storeCachedContent(
            "image",
            topicId,
            lessonId,
            contentIndex,
            prompt,
            imageBlob,
            {
              provider: "openai-dalle",
              generationParams: { model: "dall-e-3", size: "1024x1024", quality: "hd", style: "natural" },
              mimeType: "image/png",
            }
          );

          if (cached) {
            console.log(`[Image] Cached: ${cached.cache_key}`);
            return Response.json({ 
              imageUrl: cached.public_url,
              cached: false,
              cacheKey: cached.cache_key,
              quotaConsumed: QUOTA_COSTS.image,
            });
          }
        }
      } catch (error) {
        console.error("[Image] Cache store error:", error);
        // Continue to return image URL even if caching fails
      }
    }

    return Response.json({ imageUrl });
  } catch (error) {
    console.error("[DALL-E] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

