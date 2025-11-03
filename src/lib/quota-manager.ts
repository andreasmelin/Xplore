import { createClient } from "@supabase/supabase-js";

export type QuotaCost = {
  chat: number;          // GPT-4 chat
  tellMore: number;      // AI expansions
  askQuestion: number;   // AI questions
  tts: number;          // Text-to-speech (non-cached)
  stt: number;          // Speech-to-text
  image: number;        // DALL-E image generation (non-cached)
};

export const QUOTA_COSTS: QuotaCost = {
  chat: 1,
  tellMore: 1,
  askQuestion: 1,
  tts: 1,
  stt: 1,
  image: 3, // Images cost more
};

export const DAILY_QUOTA_LIMIT = 50; // Total tokens per day

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error("Missing Supabase credentials");
  }
  
  return createClient(url, key);
}

/**
 * Check if user has enough quota for an action
 */
export async function checkQuota(userId: string, cost: number): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const supabase = getSupabaseClient();
  
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Get or create today's quota record
  const { data: quotaData, error } = await supabase
    .from('daily_quota')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (error && error.code !== 'PGRST116') {
    // Error other than "not found"
    // If table doesn't exist (42P01), allow the action (graceful degradation)
    if (error.code === '42P01' || error.message?.includes('daily_quota')) {
      console.warn('[Quota] Table not found - bypassing quota check. Run migration: db/migrations/004_quota_system.sql');
      return { allowed: true, remaining: DAILY_QUOTA_LIMIT, limit: DAILY_QUOTA_LIMIT };
    }
    console.error('[Quota] Error checking quota:', error);
    return { allowed: false, remaining: 0, limit: DAILY_QUOTA_LIMIT };
  }

  const used = quotaData?.used || 0;
  const remaining = DAILY_QUOTA_LIMIT - used;
  const allowed = remaining >= cost;

  return {
    allowed,
    remaining,
    limit: DAILY_QUOTA_LIMIT,
  };
}

/**
 * Consume quota tokens
 */
export async function consumeQuota(
  userId: string,
  cost: number,
  action: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; remaining: number }> {
  const supabase = getSupabaseClient();
  
  const today = new Date().toISOString().split('T')[0];

  // Check if allowed
  const check = await checkQuota(userId, cost);
  if (!check.allowed) {
    return { success: false, remaining: check.remaining };
  }

  // Upsert quota record
  const { error: upsertError } = await supabase
    .from('daily_quota')
    .upsert({
      user_id: userId,
      date: today,
      used: (check.remaining === DAILY_QUOTA_LIMIT ? 0 : DAILY_QUOTA_LIMIT - check.remaining) + cost,
      limit: DAILY_QUOTA_LIMIT,
    }, {
      onConflict: 'user_id,date',
    });

  if (upsertError) {
    // If table doesn't exist, allow the action (graceful degradation)
    if (upsertError.code === '42P01' || upsertError.message?.includes('daily_quota')) {
      console.warn('[Quota] Table not found - bypassing quota tracking. Run migration: db/migrations/004_quota_system.sql');
      return { success: true, remaining: DAILY_QUOTA_LIMIT };
    }
    console.error('[Quota] Error consuming quota:', upsertError);
    return { success: false, remaining: check.remaining };
  }

  // Log the action
  await supabase
    .from('quota_log')
    .insert({
      user_id: userId,
      action,
      cost,
      metadata,
    });

  return {
    success: true,
    remaining: check.remaining - cost,
  };
}

/**
 * Get current quota status
 */
export async function getQuotaStatus(userId: string): Promise<{ used: number; remaining: number; limit: number }> {
  const supabase = getSupabaseClient();
  
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('daily_quota')
    .select('used')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (error || !data) {
    return {
      used: 0,
      remaining: DAILY_QUOTA_LIMIT,
      limit: DAILY_QUOTA_LIMIT,
    };
  }

  return {
    used: data.used,
    remaining: DAILY_QUOTA_LIMIT - data.used,
    limit: DAILY_QUOTA_LIMIT,
  };
}

