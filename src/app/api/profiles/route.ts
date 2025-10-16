import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCookies } from "@/lib/auth/cookies";

const USER_COOKIE = "x_user_id";

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const userId = cookies[USER_COOKIE];
  if (!userId) return Response.json({ profiles: [] }, { status: 200 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_profile")
    .select("id, name, age, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ profiles: data });
}

export async function POST(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const userId = cookies[USER_COOKIE];
  if (!userId) return Response.json({ error: "Not registered" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const age = Number.isFinite(body?.age) ? Number(body.age) : parseInt(String(body?.age ?? ""), 10);
  if (!name) return Response.json({ error: "Name required" }, { status: 400 });
  if (!Number.isFinite(age) || age < 0 || age > 120) return Response.json({ error: "Invalid age" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_profile")
    .insert({ user_id: userId, name, age })
    .select("id, name, age, created_at")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ profile: data });
}


