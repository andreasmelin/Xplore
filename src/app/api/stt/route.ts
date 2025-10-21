export const runtime = "edge";

// Simple Speech-to-Text proxy using OpenAI Whisper
// Accepts multipart/form-data with field "audio" (File/Blob)
// Optional: language (e.g., "sv")
export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });

    // Parse incoming form-data
    const inForm = await req.formData().catch(() => null);
    if (!inForm) return Response.json({ error: "Expected form-data" }, { status: 400 });
    const audio = inForm.get("audio");
    if (!(audio instanceof File)) return Response.json({ error: "Field 'audio' required" }, { status: 400 });
    const languageRaw = inForm.get("language");
    const language = typeof languageRaw === "string" && languageRaw.trim() ? languageRaw.trim() : undefined; // e.g., 'sv'

    // Upstream Whisper transcription
    const upstreamForm = new FormData();
    upstreamForm.append("model", "whisper-1");
    // Provide a filename to satisfy upstream requirements
    upstreamForm.append("file", audio, audio.name || "audio.webm");
    if (language) upstreamForm.append("language", language);

    const upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: upstreamForm,
    });
    if (!upstream.ok) {
      const err = await upstream.text().catch(() => "");
      const status = upstream.status >= 500 ? 502 : 400;
      return Response.json({ error: err || `Upstream ${upstream.status}` }, { status });
    }
    const json = await upstream.json().catch(() => ({}));
    const text: string = (json?.text ?? "").trim();
    return Response.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}


