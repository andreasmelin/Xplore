import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCookies } from "@/lib/auth/cookies";

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const { title } = body ?? {};
    const cookieHeader = req.headers.get("cookie");
    const cookies = parseCookies(cookieHeader);
    const userId = cookies["x_user_id"];
    const supabase = createSupabaseAdminClient();

    const insertData: { user_id?: string; title?: string } = {};
    if (typeof title === "string" && title.trim()) insertData.title = title.trim();
    if (typeof userId === "string" && userId.trim()) insertData.user_id = userId.trim();

    const { data, error } = await supabase
        .from("chat_session")
        .insert(insertData)
        .select("id, created_at, title, user_id")
        .single();
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ session: data });
}
