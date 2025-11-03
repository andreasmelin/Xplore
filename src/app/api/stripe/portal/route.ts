import { NextResponse } from 'next/server';
import { createCustomerPortalSession } from '@/lib/stripe/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    // Get user from session
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create customer portal session
    const session = await createCustomerPortalSession(
      user.id,
      `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/subscription`
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Portal error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}





