import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serializeCookie, setCookieOnResponse } from "@/lib/auth/cookies";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

// Cookie names
const USER_COOKIE = "x_user_id";
const EMAIL_COOKIE = "x_user_email";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const emailRaw = typeof body?.email === "string" ? body.email : "";
  const email = emailRaw.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: "Valid email required" }, { status: 400 });
  }
  const passwordRaw = typeof body?.password === "string" ? body.password : "";
  const password = passwordRaw.trim();
  if (password.length < 6) return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });

  const supabase = createSupabaseAdminClient();

  // Find user by email
  const { data: existing, error: findErr } = await supabase
    .from("app_user")
    .select("id, email, password_hash")
    .eq("email", email)
    .maybeSingle();
  if (findErr) return Response.json({ error: findErr.message }, { status: 400 });

  let user = existing;
  if (!existing) {
    // Register new user
    const password_hash = hashPassword(password);
    const { data: created, error: insertErr } = await supabase
      .from("app_user")
      .insert({ email, password_hash })
      .select("id, email")
      .single();
    if (insertErr) return Response.json({ error: insertErr.message }, { status: 400 });
    user = created as any;
  } else {
    // Existing user
    if (!existing.password_hash) {
      // Legacy account without password: set it on first login
      const newHash = hashPassword(password);
      const { data: updated, error: updErr } = await supabase
        .from("app_user")
        .update({ password_hash: newHash })
        .eq("id", existing.id)
        .select("id, email")
        .single();
      if (updErr) return Response.json({ error: updErr.message }, { status: 400 });
      user = updated as any;
    } else {
      // Verify password
      const ok = verifyPassword(password, existing.password_hash);
      if (!ok) return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }
  }

  const res = Response.json({ user: { id: user!.id, email: user!.email } });
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


