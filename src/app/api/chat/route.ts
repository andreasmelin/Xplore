import { streamText, convertToCoreMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { parseCookies } from "@/lib/auth/cookies";
import { checkAndIncrementDailyLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildXploreSystemMessage } from "@/lib/system/XploreSystemMessage";
import { getXploreSettings } from "@/lib/system/XploreSystemSettings";

export const runtime = "edge";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const body = await req.json();
  const prompt: string | undefined = typeof body?.prompt === "string" ? body.prompt : undefined;
  const messagesInput = Array.isArray(body?.messages) ? body.messages : undefined;
  const profileId: string | undefined = typeof body?.profileId === "string" && body.profileId.trim() ? body.profileId.trim() : undefined;

  // Rate limit per user per day (fallback to IP if no user)
  const cookies = parseCookies(req.headers.get("cookie"));
  const userId = cookies["x_user_id"];
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const action = "chat_request";
  const dailyLimit = 50; // can be tuned
  try {
    const check = await checkAndIncrementDailyLimit(userId, dailyLimit, action);
    if (!check.allowed) {
      return Response.json(
        { error: `Daily limit reached. Try again tomorrow.` },
        { status: 429 }
      );
    }
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }

  // Optionally fetch active profile age if provided
  let profileAge: number | undefined;
  if (profileId) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data } = await supabase
        .from("user_profile")
        .select("id, age, user_id")
        .eq("id", profileId)
        .eq("user_id", userId)
        .single();
      if (data && Number.isFinite(data.age)) profileAge = Number(data.age);
    } catch {
      // ignore profile lookup errors; fallback to undefined age
    }
  }

  const system = buildXploreSystemMessage({ age: profileAge, personaName: "Roboten Sinus" });
  const settings = getXploreSettings();

  const result = await streamText(
    prompt
      ? {
          model: openai(settings.model),
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
          temperature: settings.temperature,
          ...(settings.topP !== undefined ? { topP: settings.topP } : {}),
          ...(settings.presencePenalty !== undefined ? { presencePenalty: settings.presencePenalty } : {}),
          ...(settings.frequencyPenalty !== undefined ? { frequencyPenalty: settings.frequencyPenalty } : {}),
        }
      : {
          model: openai(settings.model),
          messages: [
            { role: "system", content: system },
            ...convertToCoreMessages(messagesInput ?? []),
          ],
          temperature: settings.temperature,
          ...(settings.topP !== undefined ? { topP: settings.topP } : {}),
          ...(settings.presencePenalty !== undefined ? { presencePenalty: settings.presencePenalty } : {}),
          ...(settings.frequencyPenalty !== undefined ? { frequencyPenalty: settings.frequencyPenalty } : {}),
        }
  );
  return result.toTextStreamResponse();
}

