-- Quota System Tables
-- Tracks API usage and token consumption

-- Daily Quota Table (replaces old rate limiting)
CREATE TABLE IF NOT EXISTS public.daily_quota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  date date NOT NULL,
  used integer NOT NULL DEFAULT 0,
  limit integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one record per user per day
  UNIQUE(user_id, date)
);

-- Quota Log Table (detailed usage tracking)
CREATE TABLE IF NOT EXISTS public.quota_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  action text NOT NULL,
  cost integer NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS daily_quota_user_date_idx ON public.daily_quota(user_id, date);
CREATE INDEX IF NOT EXISTS quota_log_user_idx ON public.quota_log(user_id);
CREATE INDEX IF NOT EXISTS quota_log_created_idx ON public.quota_log(created_at);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_daily_quota_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER daily_quota_update_timestamp
BEFORE UPDATE ON public.daily_quota
FOR EACH ROW
EXECUTE FUNCTION update_daily_quota_timestamp();

-- Comments
COMMENT ON TABLE public.daily_quota IS 'Tracks daily token usage per user';
COMMENT ON TABLE public.quota_log IS 'Detailed log of all API calls and token consumption';
COMMENT ON COLUMN public.quota_log.action IS 'Type of action: chat, tellMore, askQuestion, tts, stt, image';
COMMENT ON COLUMN public.quota_log.cost IS 'Number of tokens consumed';
COMMENT ON COLUMN public.quota_log.metadata IS 'Additional context: cached, provider, etc.';

