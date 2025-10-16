import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serializeCookie, setCookieOnResponse } from "@/lib/auth/cookies";

// Cookie names
const USER_COOKIE = "x_user_id";
const EMAIL_COOKIE = "x_user_email";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const emailRaw = typeof body?.email === "string" ? body.email : "";
  const email = emailRaw.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: "Valid email required" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Ensure a user record exists keyed by email
  const { data: user, error: upsertError } = await supabase
    .from("app_user")
    .upsert({ email }, { onConflict: "email" })
    .select("id, email, created_at")
    .single();
  if (upsertError) return Response.json({ error: upsertError.message }, { status: 400 });

  const res = Response.json({ user });
  const cookieUser = serializeCookie(USER_COOKIE, user.id, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  const cookieEmail = serializeCookie(EMAIL_COOKIE, email, {
    httpOnly: false,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  setCookieOnResponse(res, cookieUser);
  setCookieOnResponse(res, cookieEmail);
  return res;
}


