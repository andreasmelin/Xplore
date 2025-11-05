import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { parseCookies } from '@/lib/auth/cookies';

const USER_COOKIE = 'x_user_id';

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { events } = body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Invalid events data' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Verify all profiles belong to user and prepare events
    const profileIds = [...new Set(events.map(e => e.profileId))];
    const { data: profiles, error: profileError } = await supabase
      .from('user_profile')
      .select('id')
      .eq('user_id', userId)
      .in('id', profileIds);

    if (profileError || !profiles || profiles.length === 0) {
      return NextResponse.json(
        { error: 'Profile not found or access denied' },
        { status: 403 }
      );
    }

    const validProfileIds = new Set(profiles.map(p => p.id));

    // Filter events to only include valid profiles
    const validEvents = events.filter(e => validProfileIds.has(e.profileId));

    if (validEvents.length === 0) {
      return NextResponse.json(
        { error: 'No valid events to insert' },
        { status: 400 }
      );
    }

    // Get user agent from request
    const userAgent = req.headers.get('user-agent') || '';

    // Insert analytics events
    const eventsToInsert = validEvents.map(event => ({
      profile_id: event.profileId,
      session_id: event.sessionId,
      event_type: event.eventType,
      event_name: event.eventName,
      event_category: event.eventCategory || null,
      properties: event.properties || {},
      duration_ms: event.durationMs || null,
      referrer: event.referrer || null,
      user_agent: userAgent,
    }));

    const { error: insertError } = await supabase
      .from('analytics_events')
      .insert(eventsToInsert);

    if (insertError) {
      console.error('Error inserting analytics events:', insertError);
      return NextResponse.json(
        { error: 'Failed to insert events', details: insertError.message },
        { status: 500 }
      );
    }

    // Update or create sessions
    const sessionIds = [...new Set(validEvents.map(e => e.sessionId))];
    for (const sessionId of sessionIds) {
      const sessionEvents = validEvents.filter(e => e.sessionId === sessionId);
      const profileId = sessionEvents[0]?.profileId;

      if (!profileId) continue;

      // Check if session exists
      const { data: existingSession } = await supabase
        .from('analytics_sessions')
        .select('id')
        .eq('id', sessionId)
        .single();

      if (!existingSession) {
        // Create new session
        await supabase.from('analytics_sessions').insert({
          id: sessionId,
          profile_id: profileId,
          user_agent: userAgent,
        });
      }

      // Update session end time if this is a session_end event
      const sessionEndEvent = sessionEvents.find(e => e.eventType === 'session_end');
      if (sessionEndEvent) {
        await supabase
          .from('analytics_sessions')
          .update({
            session_end: new Date().toISOString(),
            duration_seconds: sessionEndEvent.durationMs ? Math.round(sessionEndEvent.durationMs / 1000) : null,
          })
          .eq('id', sessionId);
      }
    }

    return NextResponse.json({
      success: true,
      inserted: eventsToInsert.length
    });
  } catch (error) {
    console.error('Analytics track error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
