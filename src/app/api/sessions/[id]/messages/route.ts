import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
	const supabase = createSupabaseAdminClient();
	const { data, error } = await supabase
		.from("chat_message")
		.select("id, created_at, role, content")
		.eq("session_id", params.id)
		.order("created_at", { ascending: true });
	if (error) return Response.json({ error: error.message }, { status: 400 });
	return Response.json({ messages: data });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
	const body = await req.json().catch(() => ({}));
	const { role, content } = body ?? {};
	if (!role || !content) {
		return Response.json({ error: "role and content required" }, { status: 400 });
	}
	const supabase = createSupabaseAdminClient();
	const { data, error } = await supabase
		.from("chat_message")
		.insert({ session_id: params.id, role, content })
		.select("id, created_at, role, content")
		.single();
	if (error) return Response.json({ error: error.message }, { status: 400 });
	return Response.json({ message: data });
}
