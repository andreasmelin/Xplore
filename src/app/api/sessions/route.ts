import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	const { user_id, title } = body ?? {};
	const supabase = createSupabaseAdminClient();

	const insertData: { user_id?: string; title?: string } = {};
	if (typeof title === "string" && title.trim()) insertData.title = title.trim();
	if (typeof user_id === "string" && user_id.trim()) insertData.user_id = user_id.trim();

	const { data, error } = await supabase
		.from("chat_session")
		.insert(insertData)
		.select("id, created_at, title, user_id")
		.single();
	if (error) return Response.json({ error: error.message }, { status: 400 });
	return Response.json({ session: data });
}
