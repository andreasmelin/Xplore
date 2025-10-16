import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCookies } from "@/lib/auth/cookies";

const USER_COOKIE = "x_user_id";

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const userId = cookies[USER_COOKIE];
  if (!userId) return Response.json({ user: null }, { status: 200 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_user")
    .select("id, email, created_at")
    .eq("id", userId)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ user: data });
}


