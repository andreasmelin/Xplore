import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { parseCookies } from '@/lib/auth/cookies';
import { getActivitySummary, getDailyStats, getRecentActivities } from '@/lib/activity-logger-server';

const USER_COOKIE = 'x_user_id';

export async function GET(req: NextRequest) {
  try {
    // Get user from cookie (same as /api/auth/me)
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
    const profileId = searchParams.get('profileId');
    const days = parseInt(searchParams.get('days') || '7');

    if (!profileId) {
      return NextResponse.json(
        { error: 'Missing profileId' },
        { status: 400 }
      );
    }

    // Verify profile belongs to user
    const supabase = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('*')
      .eq('id', profileId)
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get dashboard data
    const [summary, dailyStats, recentActivities] = await Promise.all([
      getActivitySummary(profileId, days),
      getDailyStats(profileId, days),
      getRecentActivities(profileId, 20),
    ]);

    // Calculate additional metrics
    const totalTime = summary?.total_time_seconds || 0;
    const totalActivities = summary?.total_activities || 0;
    const uniqueLetters = summary?.unique_letters || 0;
    const uniqueTopics = summary?.unique_topics || 0;
    const totalMath = summary?.total_math || 0;
    const totalChat = summary?.total_chat || 0;
    const averageScore = summary?.average_score || null;

    // Calculate streaks and engagement
    const daysActive = dailyStats.filter(d => d.activities_completed > 0).length;
    const averageTimePerDay = daysActive > 0 ? Math.round(totalTime / daysActive) : 0;
    
    // Calculate current streak
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStats = dailyStats.find(d => d.date === dateStr);
      
      if (dayStats && dayStats.activities_completed > 0) {
        currentStreak++;
      } else if (dateStr !== today) {
        // Don't break streak if today isn't complete yet
        break;
      }
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        name: profile.name,
        age: profile.age,
      },
      summary: {
        totalTime,
        totalActivities,
        uniqueLetters,
        uniqueTopics,
        totalMath,
        totalChat,
        averageScore,
        daysActive,
        averageTimePerDay,
        currentStreak,
      },
      dailyStats,
      recentActivities,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to load dashboard',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

