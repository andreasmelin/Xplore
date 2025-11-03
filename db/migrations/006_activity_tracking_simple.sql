-- Activity Tracking for Parent Dashboard
-- Run this in Supabase SQL Editor (Part 1 of 2)

-- Step 1: Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_id TEXT,
  activity_name TEXT,
  duration_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  score INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create indexes for activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_profile ON activity_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_profile_date ON activity_log(profile_id, created_at DESC);

-- Step 3: Create daily_stats table
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_time_seconds INTEGER DEFAULT 0,
  activities_completed INTEGER DEFAULT 0,
  activities_started INTEGER DEFAULT 0,
  letters_practiced TEXT[] DEFAULT '{}',
  topics_explored TEXT[] DEFAULT '{}',
  math_activities INTEGER DEFAULT 0,
  chat_messages INTEGER DEFAULT 0,
  average_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, date)
);

-- Step 4: Create indexes for daily_stats
CREATE INDEX IF NOT EXISTS idx_daily_stats_profile_date ON daily_stats(profile_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date DESC);





