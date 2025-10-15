import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
	if (!url || !serviceRoleKey) {
		throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
	}
	return createClient(url, serviceRoleKey, {
		auth: { persistSession: false },
	});
}
