import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { parseCookies } from '@/lib/auth/cookies';

const USER_COOKIE = 'x_user_id';

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { profileId, activityType, activityId, activityName, durationSeconds, completed, score } = body;

    if (!profileId || !activityType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify profile belongs to user
    const supabase = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('id')
      .eq('id', profileId)
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found or access denied' },
        { status: 403 }
      );
    }

    // Log the activity using admin client
    const adminClient = createSupabaseAdminClient();
    const { error: insertError } = await adminClient.from('activity_log').insert({
      profile_id: profileId,
      activity_type: activityType,
      activity_id: activityId,
      activity_name: activityName,
      duration_seconds: durationSeconds || 0,
      completed: completed || false,
      score: score,
      metadata: {},
    });

    if (insertError) {
      console.error('Error logging activity:', insertError);
      console.error('Insert error details:', insertError.message, insertError.details);
      return NextResponse.json(
        { error: 'Failed to log activity', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Activity log error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}





