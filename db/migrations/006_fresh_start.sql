-- Fresh start - Drop and recreate activity tracking tables
-- WARNING: This will delete any existing activity data!
-- Run this in your Supabase SQL editor

-- Drop existing tables and functions
DROP TRIGGER IF EXISTS trigger_update_daily_stats ON activity_log;
DROP FUNCTION IF EXISTS update_daily_stats_from_activity() CASCADE;
DROP FUNCTION IF EXISTS get_profile_summary(UUID, INTEGER) CASCADE;
DROP TABLE IF EXISTS daily_stats CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;

-- Recreate activity_log table
CREATE TABLE activity_log (
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

CREATE INDEX idx_activity_log_profile ON activity_log(profile_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_type ON activity_log(activity_type);
CREATE INDEX idx_activity_log_profile_date ON activity_log(profile_id, created_at DESC);

-- Recreate daily_stats table
CREATE TABLE daily_stats (
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

CREATE INDEX idx_daily_stats_profile_date ON daily_stats(profile_id, date DESC);
CREATE INDEX idx_daily_stats_date ON daily_stats(date DESC);

-- Recreate trigger function
CREATE OR REPLACE FUNCTION update_daily_stats_from_activity()
RETURNS TRIGGER AS $function$
DECLARE
  v_date DATE;
BEGIN
  v_date := DATE(NEW.created_at);
  
  INSERT INTO daily_stats (
    profile_id,
    date,
    total_time_seconds,
    activities_completed,
    activities_started,
    letters_practiced,
    topics_explored,
    math_activities,
    chat_messages
  )
  VALUES (
    NEW.profile_id,
    v_date,
    COALESCE(NEW.duration_seconds, 0),
    CASE WHEN NEW.completed THEN 1 ELSE 0 END,
    1,
    CASE WHEN NEW.activity_type = 'letter' AND NEW.activity_id IS NOT NULL 
         THEN ARRAY[NEW.activity_id] ELSE '{}' END,
    CASE WHEN NEW.activity_type = 'explore' AND NEW.activity_id IS NOT NULL 
         THEN ARRAY[NEW.activity_id] ELSE '{}' END,
    CASE WHEN NEW.activity_type = 'math' THEN 1 ELSE 0 END,
    CASE WHEN NEW.activity_type = 'chat' THEN 1 ELSE 0 END
  )
  ON CONFLICT (profile_id, date) DO UPDATE SET
    total_time_seconds = daily_stats.total_time_seconds + COALESCE(NEW.duration_seconds, 0),
    activities_completed = daily_stats.activities_completed + CASE WHEN NEW.completed THEN 1 ELSE 0 END,
    activities_started = daily_stats.activities_started + 1,
    letters_practiced = array_cat(
      daily_stats.letters_practiced,
      CASE WHEN NEW.activity_type = 'letter' AND NEW.activity_id IS NOT NULL 
           THEN ARRAY[NEW.activity_id] ELSE '{}' END
    ),
    topics_explored = array_cat(
      daily_stats.topics_explored,
      CASE WHEN NEW.activity_type = 'explore' AND NEW.activity_id IS NOT NULL 
           THEN ARRAY[NEW.activity_id] ELSE '{}' END
    ),
    math_activities = daily_stats.math_activities + CASE WHEN NEW.activity_type = 'math' THEN 1 ELSE 0 END,
    chat_messages = daily_stats.chat_messages + CASE WHEN NEW.activity_type = 'chat' THEN 1 ELSE 0 END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- Attach trigger
CREATE TRIGGER trigger_update_daily_stats
AFTER INSERT ON activity_log
FOR EACH ROW
EXECUTE FUNCTION update_daily_stats_from_activity();

-- Recreate summary function
CREATE OR REPLACE FUNCTION get_profile_summary(
  p_profile_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  total_time_seconds BIGINT,
  total_activities INTEGER,
  unique_letters INTEGER,
  unique_topics INTEGER,
  total_math INTEGER,
  total_chat INTEGER,
  average_score NUMERIC
) AS $function$
BEGIN
  RETURN QUERY
  SELECT
    SUM(ds.total_time_seconds)::BIGINT,
    SUM(ds.activities_completed)::INTEGER,
    COUNT(DISTINCT unnested_letters)::INTEGER,
    COUNT(DISTINCT unnested_topics)::INTEGER,
    SUM(ds.math_activities)::INTEGER,
    SUM(ds.chat_messages)::INTEGER,
    AVG(ds.average_score)::NUMERIC
  FROM daily_stats ds
  LEFT JOIN LATERAL unnest(ds.letters_practiced) AS unnested_letters ON true
  LEFT JOIN LATERAL unnest(ds.topics_explored) AS unnested_topics ON true
  WHERE ds.profile_id = p_profile_id
  AND ds.date >= CURRENT_DATE - p_days
  GROUP BY ds.profile_id;
END;
$function$ LANGUAGE plpgsql;

-- Success message
SELECT 'Activity tracking tables created successfully!' as status;

