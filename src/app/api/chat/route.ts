import { streamText, convertToCoreMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export const runtime = "edge";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const body = await req.json();
  const prompt: string | undefined = typeof body?.prompt === "string" ? body.prompt : undefined;
  const messagesInput = Array.isArray(body?.messages) ? body.messages : undefined;

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

