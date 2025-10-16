import { createSupabaseAdminClient } from "./supabase/admin";

export type RateLimitCheck = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string; // ISO date
};

function getUtcDayBounds(date = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59));
  return { start, end };
}

export async function checkAndIncrementDailyLimit(
  userId: string,
  dailyLimit: number,
  action: string
): Promise<RateLimitCheck> {
  const supabase = createSupabaseAdminClient();
  const { start: dayStart, end: dayEnd } = getUtcDayBounds();

  const { count, error: countError } = await supabase
    .from("usage_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", dayStart.toISOString())
    .lte("created_at", dayEnd.toISOString());
  if (countError) throw new Error(countError.message);
  const used = count ?? 0;

  const remaining = Math.max(0, dailyLimit - used);
  const allowed = remaining > 0;
  const resetAt = new Date(dayEnd).toISOString();

  if (allowed) {
    const { error: insertError } = await supabase
      .from("usage_log")
      .insert({ user_id: userId, action });
    if (insertError) throw new Error(insertError.message);
  }

  return { allowed, remaining: Math.max(0, remaining - (allowed ? 1 : 0)), limit: dailyLimit, resetAt };
}

export async function getDailyStatus(
  userId: string,
  dailyLimit: number,
  action: string
): Promise<RateLimitCheck> {
  const supabase = createSupabaseAdminClient();
  const { start: dayStart, end: dayEnd } = getUtcDayBounds();
  const { count, error } = await supabase
    .from("usage_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", dayStart.toISOString())
    .lte("created_at", dayEnd.toISOString());
  if (error) throw new Error(error.message);
  const used = count ?? 0;
  const remaining = Math.max(0, dailyLimit - used);
  return {
    allowed: remaining > 0,
    remaining,
    limit: dailyLimit,
    resetAt: new Date(dayEnd).toISOString(),
  };
}


