import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function extractSessionIdFromUrl(urlString: string): string | null {
    try {
        const url = new URL(urlString);
        const parts = url.pathname.split("/").filter(Boolean);
        // ... expect ["api","sessions",":id","messages"]
        const sessionsIdx = parts.indexOf("sessions");
        if (sessionsIdx !== -1 && parts[sessionsIdx + 1]) {
            return parts[sessionsIdx + 1];
        }
        return null;
    } catch {
        return null;
    }
}

export async function GET(req: Request) {
    const sessionId = extractSessionIdFromUrl(req.url);
    if (!sessionId) return Response.json({ error: "Missing session id" }, { status: 400 });
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
        .from("chat_message")
        .select("id, created_at, role, content")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ messages: data });
}

export async function POST(req: Request) {
    const sessionId = extractSessionIdFromUrl(req.url);
    if (!sessionId) return Response.json({ error: "Missing session id" }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const { role, content } = body ?? {};
    if (!role || !content) {
        return Response.json({ error: "role and content required" }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
        .from("chat_message")
        .insert({ session_id: sessionId, role, content })
        .select("id, created_at, role, content")
        .single();
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ message: data });
}
