// Stripe server-side utilities
import Stripe from 'stripe';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});

// Admin client for database operations
const adminClient = createSupabaseAdminClient();

// Get or create Stripe customer for user
export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  // Check if customer already exists in database
  const { data: subscription } = await adminClient
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });

  // Store customer ID in database
  await adminClient.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customer.id,
    status: 'incomplete',
    plan_name: 'free',
    stripe_price_id: '',
  });

  return customer.id;
}

// Get user's active subscription
export async function getUserSubscription(userId: string) {
  const { data, error } = await adminClient
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['trialing', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

// Check if user has active subscription
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  const now = new Date();
  const periodEnd = subscription.current_period_end 
    ? new Date(subscription.current_period_end) 
    : null;

  return subscription.status === 'trialing' || 
         (subscription.status === 'active' && (!periodEnd || periodEnd > now));
}

// Get user's plan name
export async function getUserPlan(userId: string): Promise<string> {
  const subscription = await getUserSubscription(userId);
  return subscription?.plan_name || 'free';
}

// Create Stripe checkout session
export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  priceId: string;
  planName: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const customerId = await getOrCreateStripeCustomer(params.userId, params.email);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 7,
      metadata: {
        userId: params.userId,
        planName: params.planName,
      },
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  });

  return session;
}

// Create customer portal session for managing subscriptions
export async function createCustomerPortalSession(userId: string, returnUrl: string) {
  const subscription = await getUserSubscription(userId);
  if (!subscription?.stripe_customer_id) {
    throw new Error('No subscription found');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: returnUrl,
  });

  return session;
}

// Update subscription in database from Stripe webhook
export async function updateSubscriptionFromStripe(stripeSubscription: Stripe.Subscription) {
  const userId = stripeSubscription.metadata.userId;
  const planName = stripeSubscription.metadata.planName || 'free';

  const { error } = await adminClient
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: stripeSubscription.customer as string,
      stripe_subscription_id: stripeSubscription.id,
      stripe_price_id: stripeSubscription.items.data[0].price.id,
      plan_name: planName,
      status: stripeSubscription.status,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      trial_end: stripeSubscription.trial_end 
        ? new Date(stripeSubscription.trial_end * 1000).toISOString()
        : null,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      canceled_at: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000).toISOString()
        : null,
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

// Cancel subscription
export async function cancelSubscription(userId: string, immediately: boolean = false) {
  const subscription = await getUserSubscription(userId);
  if (!subscription?.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  if (immediately) {
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
  } else {
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  }
}





