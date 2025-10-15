import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type MutableCookieStore = {
  get: (name: string) => { value: string } | undefined;
  set?: (options: { name: string; value: string } & CookieOptions) => void;
};

export async function createSupabaseServerClient() {
  const cookieStore = (await cookies()) as unknown as MutableCookieStore;
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) =>
          cookieStore.set?.({ name, value, ...options }),
        remove: (name: string, options: CookieOptions) =>
          cookieStore.set?.({ name, value: "", ...options, expires: new Date(0) }),
      },
    }
  );
}
