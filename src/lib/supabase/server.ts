import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        get: (name: string) => cookies().get(name)?.value,
        set: (name: string, value: string, options: any) => cookies().set({ name, value, ...options }),
        remove: (name: string, options: any) => cookies().set({ name, value: "", ...options, expires: new Date(0) }),
      },
    }
  );
}
