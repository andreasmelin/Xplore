import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createCustomerPortalSession } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
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





