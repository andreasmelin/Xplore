export async function GET() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	const env = {
		urlPresent: Boolean(url),
		anonKeyPresent: Boolean(anonKey),
	};

	if (!url || !anonKey) {
		return Response.json(
			{ ok: false, env, message: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" },
			{ status: 500 }
		);
	}

	let authHealth: { ok: boolean; status?: number } = { ok: false };
	try {
		const res = await fetch(`${url}/auth/v1/health`, { method: "GET" });
		authHealth = { ok: res.ok, status: res.status };
	} catch {
		authHealth = { ok: false };
	}

	const ok = env.urlPresent && env.anonKeyPresent && authHealth.ok;
	return Response.json({ ok, env, authHealth });
}
