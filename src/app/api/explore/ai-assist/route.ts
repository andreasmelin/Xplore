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
    expansionLevel?: number;
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
      const expansionLevel = context.expansionLevel || 1;

      systemMessage = `Du är en pedagogisk AI-assistent för barn ${ageGroup}. 
Din uppgift är att ge YTTERLIGARE information som kompletterar vad barnet redan har läst.

VIKTIGA REGLER:
- Skriv DIREKT fakta och information - ingen small talk eller utrop som "Åh, vad spännande"
- Matcha den ursprungliga textens ton, stil OCH LÄNGD (informationstät, pedagogisk)
- Använd samma format som originaltexten (inte konversationsstil)
- Behåll SAMMA SVÅRIGHETSGRAD som originaltexten - inte mer avancerat
- Ge NY information som barnet inte redan har läst (inte upprepa tidigare sagt)
- Använd konkreta fakta, siffror, exempel - inget fluff
- Skriv ungefär LIKA MYCKET text som originalstycket (inte längre!)

SPRÅKANPASSNING:
- Anpassat språk för ${ageGroup} - varje gång du skriver, inte bara första gången
- Du får använda avancerade/tekniska ord (som "ekolokalisering", "fotosyntesen", "gravitation")
- Men FÖRKLARA ALLTID sådana ord direkt i samma mening
- Exempel: "Fladdermössen använder ekolokalisering - de skickar ut ljud och lyssnar på ekot för att hitta i mörkret"
- Använd ord de kan förstå, men introducera gärna nya begrepp med tydliga förklaringar

Detta är tillägg ${expansionLevel} - ge NEW information på samma nivå som originalet.`;

      userMessage = `Ämne: ${context.topicTitle}
Lektion: ${context.lessonTitle}
Åldersgrupp: ${ageGroup}

ORIGINALINNEHÅLL:
${context.currentContent}

Ge ytterligare information (tillägg ${expansionLevel}) som kompletterar detta. Matcha SAMMA längd och SAMMA svårighetsgrad som originalet. Skriv direkt informationen utan inledande fraser.`;
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
- Uppmuntra nyfikenhet och fortsatt lärande

SPRÅKANPASSNING:
- Du får använda tekniska/avancerade ord när det passar
- Men FÖRKLARA ALLTID dem direkt: "Ekolokalisering betyder att man använder ljud för att hitta saker"
- Introducera nya begrepp på ett naturligt sätt som passar ${ageGroup}
- Bygg på barnets ordförråd samtidigt som du gör det begripligt`;

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
        temperature: mode === "tell-more" ? 0.4 : 0.7, // Lower temp for consistent expansions
        max_tokens: 400, // Match original text length
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

