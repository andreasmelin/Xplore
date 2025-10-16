import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCookies, serializeCookie, setCookieOnResponse } from "@/lib/auth/cookies";

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const { title } = body ?? {};
    const cookieHeader = req.headers.get("cookie");
    const cookies = parseCookies(cookieHeader);
    let userId = cookies["x_user_id"];
    const emailCookie = cookies["x_user_email"]?.toLowerCase?.();
    const supabase = createSupabaseAdminClient();

    // Canonicalize: require email cookie, upsert, and use that id only
    if (!emailCookie) {
        return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { data: ensuredUser, error: upsertErr } = await supabase
        .from("app_user")
        .upsert({ email: emailCookie }, { onConflict: "email" })
        .select("id, email")
        .single();
    if (upsertErr || !ensuredUser) {
        return Response.json({ error: upsertErr?.message ?? "Could not ensure user" }, { status: 400 });
    }
    userId = ensuredUser.id;
    const shouldRewriteUserCookie = cookies["x_user_id"] !== userId;

    const insertData: { user_id?: string; title?: string } = {};
    if (typeof title === "string" && title.trim()) insertData.title = title.trim();
    insertData.user_id = userId.trim();

    const { data, error } = await supabase
        .from("chat_session")
        .insert(insertData)
        .select("id, created_at, title, user_id")
        .single();
    if (error) {
        // Attach debug info to help diagnose FK issues
        const byId = await supabase.from("app_user").select("id").eq("id", userId).maybeSingle();
        const byEmail = emailCookie
            ? await supabase.from("app_user").select("id").eq("email", emailCookie).maybeSingle()
            : { data: null } as any;
        return Response.json(
            {
                error: error.message,
                debug: {
                    emailCookie: emailCookie ?? null,
                    userIdTried: userId,
                    userByIdExists: !!byId.data,
                    userByEmailExists: !!(byEmail as any).data,
                },
            },
            { status: 400 }
        );
    }
    const res = Response.json({ session: data });
    if (shouldRewriteUserCookie && userId) {
        setCookieOnResponse(res, serializeCookie("x_user_id", userId, { httpOnly: true, path: "/", sameSite: "lax", maxAge: 60*60*24*365 }));
    }
    return res;
}
