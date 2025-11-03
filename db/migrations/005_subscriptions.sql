-- Subscription Management Tables
-- Run this migration in your Supabase SQL editor

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT NOT NULL,
  plan_name TEXT NOT NULL, -- 'starter', 'family', 'premium'
  status TEXT NOT NULL, -- 'trialing', 'active', 'past_due', 'canceled', 'incomplete'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE user_id = p_user_id 
    AND status IN ('trialing', 'active')
    AND (current_period_end IS NULL OR current_period_end > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Helper function to get user's current plan
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_plan_name TEXT;
BEGIN
  SELECT plan_name INTO v_plan_name
  FROM subscriptions
  WHERE user_id = p_user_id
  AND status IN ('trialing', 'active')
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_plan_name, 'free');
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE subscriptions IS 'Stores Stripe subscription information for users';
COMMENT ON COLUMN subscriptions.status IS 'Stripe subscription status: trialing, active, past_due, canceled, incomplete';
COMMENT ON COLUMN subscriptions.plan_name IS 'Internal plan identifier: starter, family, premium';





