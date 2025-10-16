import { serializeCookie, setCookieOnResponse } from "@/lib/auth/cookies";

const USER_COOKIE = "x_user_id";
const EMAIL_COOKIE = "x_user_email";

export async function POST() {
  const res = Response.json({ ok: true });
  // Expire cookies immediately
  const expired = new Date(0);
  setCookieOnResponse(res, serializeCookie(USER_COOKIE, "", { path: "/", httpOnly: true, expires: expired }));
  setCookieOnResponse(res, serializeCookie(EMAIL_COOKIE, "", { path: "/", httpOnly: false, expires: expired }));
  return res;
}


