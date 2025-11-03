import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserSubscription, getUserPlan } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    // Get user from session
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get subscription details
    const subscription = await getUserSubscription(user.id);
    const planName = await getUserPlan(user.id);

    if (!subscription) {
      return NextResponse.json({
        hasSubscription: false,
        plan: 'free',
        status: null,
      });
    }

    return NextResponse.json({
      hasSubscription: true,
      plan: planName,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end,
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}





