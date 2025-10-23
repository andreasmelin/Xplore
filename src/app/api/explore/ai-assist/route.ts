export const runtime = "edge";

import { consumeQuota, QUOTA_COSTS } from "@/lib/quota-manager";
import { parseCookies } from "@/lib/auth/cookies";

type RequestBody = {
  mode: "tell-more" | "ask-question";
  question?: string;
  context: {
    topicTitle: string;
    lessonTitle: string;
    currentContent: string;
    contentType: string;
  };
  profileAge: number | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const { mode, question, context, profileAge } = body;

    if (!mode || !context) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get user ID and consume quota
    const cookies = parseCookies(req.headers.get("cookie"));
    const userId = cookies["x_user_id"];

    if (userId) {
      const cost = mode === "tell-more" ? QUOTA_COSTS.tellMore : QUOTA_COSTS.askQuestion;
      const quotaResult = await consumeQuota(userId, cost, mode, {
        topic: context.topicTitle,
        lesson: context.lessonTitle,
      });
      
      if (!quotaResult.success) {
        return Response.json({ 
          error: "Daily quota exceeded. Each AI interaction costs 1 token. Try again tomorrow!",
          remaining: quotaResult.remaining 
        }, { status: 429 });
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    // Determine age group for appropriate language
    const ageGroup = profileAge
      ? profileAge <= 6
        ? "4-6 år"
        : profileAge <= 9
        ? "7-9 år"
        : "10-12 år"
      : "7-9 år"; // default

    // Build system message based on mode
    let systemMessage = "";
    let userMessage = "";

    if (mode === "tell-more") {
      systemMessage = `Du är en entusiastisk och pedagogisk AI-assistent för barn ${ageGroup}. 
Din uppgift är att ge mer detaljer och fördjupning om ett ämne som barnet just lärt sig om.

Riktlinjer:
- Använd enkelt, tydligt språk anpassat för ${ageGroup}
- Var entusiastisk och uppmuntrande
- Ge 2-4 extra fakta eller detaljer
- Använd jämförelser och exempel som barn förstår
- Gör det spännande och roligt!
- Håll svaret till 3-5 meningar
- Använd inte svåra ord utan att förklara dem`;

      userMessage = `Ämne: ${context.topicTitle}
Lektion: ${context.lessonTitle}
Vad vi precis lärt oss: ${context.currentContent}

Berätta mer om detta! Ge mig fler spännande detaljer som passar för barn ${ageGroup}.`;
    } else {
      // ask-question mode
      systemMessage = `Du är en hjälpsam och pedagogisk AI-assistent för barn ${ageGroup}.
Din uppgift är att svara på barnets frågor om det de läser om.

Riktlinjer:
- Använd enkelt, tydligt språk anpassat för ${ageGroup}
- Var vänlig och uppmuntrande
- Svara direkt på frågan
- Använd jämförelser och exempel som barn förstår
- Om frågan är för komplex, förenkla svaret
- Håll svaret till 3-6 meningar
- Uppmuntra nyfikenhet och fortsatt lärande`;

      userMessage = `Ämne: ${context.topicTitle}
Lektion: ${context.lessonTitle}
Kontext: ${context.currentContent}

Barnets fråga: ${question}

Svara på barnets fråga på ett sätt som passar för barn ${ageGroup}.`;
    }

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return Response.json(
        { error: "Failed to generate response" },
        { status: response.status }
      );
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const aiResponse = data.choices[0]?.message?.content || "Jag kunde inte hitta ett svar just nu.";

    return Response.json({ response: aiResponse });
  } catch (error) {
    console.error("AI assist error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

