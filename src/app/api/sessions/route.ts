import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	const { user_id, title } = body ?? {};
	if (!user_id) {
		return Response.json({ error: "user_id required" }, { status: 400 });
	}
	const supabase = createSupabaseAdminClient();
	const { data, error } = await supabase
		.from("chat_session")
		.insert({ user_id, title })
		.select("id, created_at, title")
		.single();
	if (error) return Response.json({ error: error.message }, { status: 400 });
	return Response.json({ session: data });
}
