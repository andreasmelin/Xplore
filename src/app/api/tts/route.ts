export const runtime = "edge";

type TtsBody = {
  text?: string;
  voice?: string;
  format?: "mp3" | "opus";
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as TtsBody;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voice = typeof body.voice === "string" && body.voice.trim() ? body.voice.trim() : "alloy";
  const format = body.format === "opus" ? "opus" : "mp3";
  if (!text) return Response.json({ error: "Text required" }, { status: 400 });

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
      format,
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


