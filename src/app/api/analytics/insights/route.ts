import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { parseCookies } from '@/lib/auth/cookies';

const USER_COOKIE = 'x_user_id';

export async function GET(req: NextRequest) {
  try {
    // Get user from cookie
    const cookieHeader = req.headers.get('cookie');
    const cookies = parseCookies(cookieHeader);
    const userId = cookies[USER_COOKIE];

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    const profileId = searchParams.get('profileId');
    const format = searchParams.get('format') || 'summary'; // 'summary' | 'detailed' | 'export'

    const supabase = createSupabaseAdminClient();

    // Get all profiles for this user
    const { data: profiles, error: profileError } = await supabase
      .from('user_profile')
      .select('id, name')
      .eq('user_id', userId);

    if (profileError || !profiles) {
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: 500 }
      );
    }

    // If profileId specified, verify it belongs to user
    if (profileId && !profiles.some(p => p.id === profileId)) {
      return NextResponse.json(
        { error: 'Profile not found or access denied' },
        { status: 403 }
      );
    }

    // Get feature popularity
    const { data: featurePopularity, error: fpError } = await supabase
      .rpc('get_feature_popularity', {
        p_days: days,
        p_limit: 20,
      });

    if (fpError) {
      console.error('Error getting feature popularity:', fpError);
    }

    // Get user flows
    const { data: userFlows, error: ufError } = await supabase
      .rpc('get_user_flows', {
        p_days: days,
        p_limit: 20,
      });

    if (ufError) {
      console.error('Error getting user flows:', ufError);
    }

    // Get abandonment rates
    const { data: abandonmentRates, error: arError } = await supabase
      .rpc('get_abandonment_rates', {
        p_days: days,
      });

    if (arError) {
      console.error('Error getting abandonment rates:', arError);
    }

    // Get profile-specific engagement if profileId specified
    let profileEngagement = null;
    if (profileId) {
      const { data: engagement, error: engError } = await supabase
        .rpc('get_profile_engagement', {
          p_profile_id: profileId,
          p_days: days,
        });

      if (!engError && engagement && engagement.length > 0) {
        profileEngagement = engagement[0];
      }
    }

    // Get daily activity trend
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: dailyActivity, error: daError } = await supabase
      .from('analytics_events')
      .select('created_at, event_type, event_name')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (daError) {
      console.error('Error getting daily activity:', daError);
    }

    // Process daily activity into daily counts
    const dailyCounts: Record<string, { date: string; events: number; unique_features: Set<string> }> = {};

    if (dailyActivity) {
      dailyActivity.forEach(event => {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        if (!dailyCounts[date]) {
          dailyCounts[date] = { date, events: 0, unique_features: new Set() };
        }
        dailyCounts[date].events++;
        dailyCounts[date].unique_features.add(event.event_name);
      });
    }

    const dailyTrend = Object.values(dailyCounts).map(d => ({
      date: d.date,
      events: d.events,
      unique_features: d.unique_features.size,
    }));

    // Get total stats
    const { count: totalEvents } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    const { count: totalSessions } = await supabase
      .from('analytics_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('session_start', startDate.toISOString());

    // Format based on requested format
    if (format === 'export') {
      // Export format optimized for AI analysis
      return NextResponse.json({
        period: {
          days,
          start_date: startDate.toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
        },
        summary: {
          total_events: totalEvents || 0,
          total_sessions: totalSessions || 0,
          profiles_tracked: profiles.length,
        },
        feature_popularity: featurePopularity || [],
        user_flows: userFlows || [],
        abandonment_analysis: abandonmentRates || [],
        daily_trend: dailyTrend,
        profile_engagement: profileEngagement,
        insights: generateInsights(featurePopularity, abandonmentRates, userFlows),
      });
    }

    if (format === 'detailed') {
      // Detailed format with all data
      return NextResponse.json({
        period: { days, start_date: startDate, end_date: new Date() },
        totals: {
          events: totalEvents || 0,
          sessions: totalSessions || 0,
        },
        profiles,
        feature_popularity: featurePopularity || [],
        user_flows: userFlows || [],
        abandonment_rates: abandonmentRates || [],
        daily_trend: dailyTrend,
        profile_engagement: profileEngagement,
      });
    }

    // Default summary format
    return NextResponse.json({
      period: { days },
      totals: {
        events: totalEvents || 0,
        sessions: totalSessions || 0,
      },
      top_features: (featurePopularity || []).slice(0, 10),
      top_flows: (userFlows || []).slice(0, 5),
      high_abandonment: (abandonmentRates || []).filter(r => r.abandonment_rate > 30).slice(0, 5),
      daily_trend: dailyTrend,
    });
  } catch (error) {
    console.error('Analytics insights error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Generate AI-friendly insights from the data
function generateInsights(
  featurePopularity: any[] | null,
  abandonmentRates: any[] | null,
  userFlows: any[] | null
) {
  const insights: string[] = [];

  if (featurePopularity && featurePopularity.length > 0) {
    const topFeature = featurePopularity[0];
    insights.push(
      `Most popular feature: ${topFeature.event_name} with ${topFeature.total_uses} uses by ${topFeature.unique_users} users`
    );

    const leastUsed = featurePopularity[featurePopularity.length - 1];
    insights.push(
      `Least used feature: ${leastUsed.event_name} with only ${leastUsed.total_uses} uses`
    );

    const highCompletion = featurePopularity.filter(f => f.completion_rate > 80);
    if (highCompletion.length > 0) {
      insights.push(
        `Features with high completion (>80%): ${highCompletion.map(f => f.event_name).join(', ')}`
      );
    }

    const lowCompletion = featurePopularity.filter(f => f.completion_rate < 50 && f.completion_rate > 0);
    if (lowCompletion.length > 0) {
      insights.push(
        `Features with low completion (<50%): ${lowCompletion.map(f => f.event_name).join(', ')}`
      );
    }
  }

  if (abandonmentRates && abandonmentRates.length > 0) {
    const highAbandonment = abandonmentRates.filter(r => r.abandonment_rate > 50);
    if (highAbandonment.length > 0) {
      insights.push(
        `High abandonment features (>50%): ${highAbandonment.map(r => `${r.event_name} (${r.abandonment_rate}%)`).join(', ')}`
      );
    }
  }

  if (userFlows && userFlows.length > 0) {
    const topFlow = userFlows[0];
    insights.push(
      `Most common user flow: ${topFlow.from_feature} → ${topFlow.to_feature} (${topFlow.transition_count} times)`
    );
  }

  return insights;
}
