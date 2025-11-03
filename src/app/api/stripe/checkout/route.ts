import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { priceId, planName } = body;

    if (!priceId || !planName) {
      return NextResponse.json(
        { error: 'Missing priceId or planName' },
        { status: 400 }
      );
    }

    // Create checkout session
    const session = await createCheckoutSession({
      userId: user.id,
      email: user.email!,
      priceId,
      planName,
      successUrl: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/dashboard?success=true`,
      cancelUrl: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}





