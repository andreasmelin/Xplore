// Server-side activity data retrieval utilities
// Only use these in API routes or server components!

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Get activity summary for a profile
export async function getActivitySummary(profileId: string, days: number = 7) {
  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .rpc('get_profile_summary', {
      p_profile_id: profileId,
      p_days: days,
    });

  if (error) {
    console.error('Error getting summary:', error);
    return null;
  }

  return data?.[0] || null;
}

// Get daily stats for charts
export async function getDailyStats(profileId: string, days: number = 7) {
  const adminClient = createSupabaseAdminClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await adminClient
    .from('daily_stats')
    .select('*')
    .eq('profile_id', profileId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    console.error('Error getting daily stats:', error);
    return [];
  }

  return data || [];
}

// Get recent activities
export async function getRecentActivities(profileId: string, limit: number = 10) {
  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from('activity_log')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error getting recent activities:', error);
    return [];
  }

  return data || [];
}






