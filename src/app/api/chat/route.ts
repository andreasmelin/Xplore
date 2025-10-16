import { streamText, convertToCoreMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { parseCookies } from "@/lib/auth/cookies";
import { checkAndIncrementDailyLimit } from "@/lib/rate-limit";

export const runtime = "edge";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const body = await req.json();
  const prompt: string | undefined = typeof body?.prompt === "string" ? body.prompt : undefined;
  const messagesInput = Array.isArray(body?.messages) ? body.messages : undefined;

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

  const result = await streamText(
    prompt
      ? {
          model: openai("gpt-4o-mini"),
          prompt,
        }
      : {
          model: openai("gpt-4o-mini"),
          messages: convertToCoreMessages(messagesInput ?? []),
        }
  );
  return result.toTextStreamResponse();
}

