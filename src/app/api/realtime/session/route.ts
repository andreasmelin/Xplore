export const runtime = "edge";

type RealtimeSessionRequest = { voice?: string };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RealtimeSessionRequest;
  const voice = typeof body?.voice === "string" && body.voice.trim() ? body.voice.trim() : "alloy";
  const modelPrimary = "gpt-4o-realtime-preview-2024-12-17";
  const modelFallback = "gpt-4o-realtime-preview";

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });

  async function create(model: string) {
    return fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "OpenAI-Beta": "realtime=v1",
      "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, voice }),
    });
  }

  let upstream = await create(modelPrimary);
  if (!upstream.ok) {
    const firstErrText = await upstream.text().catch(() => "");
    // Try fallback model name if primary fails
    upstream = await create(modelFallback);
    if (!upstream.ok) {
      const secondErr = await upstream.text().catch(() => "");
      return Response.json({ error: secondErr || firstErrText || `Upstream ${upstream.status}` }, { status: 400 });
    }
  }
  const json = await upstream.json();
  return Response.json({ session: json, model: json?.model || modelPrimary });
}


