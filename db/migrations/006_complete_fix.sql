-- Complete fix for activity tracking tables
-- Run this in your Supabase SQL editor

-- First, drop and recreate the trigger (in case old version exists)
DROP TRIGGER IF EXISTS trigger_update_daily_stats ON activity_log;
DROP FUNCTION IF EXISTS update_daily_stats_from_activity();

-- Add missing columns to activity_log
ALTER TABLE activity_log 
ADD COLUMN IF NOT EXISTS activity_name TEXT;

-- Add missing columns to daily_stats
ALTER TABLE daily_stats
ADD COLUMN IF NOT EXISTS activities_started INTEGER DEFAULT 0;

ALTER TABLE daily_stats
ADD COLUMN IF NOT EXISTS average_score INTEGER;

ALTER TABLE daily_stats
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Recreate the trigger function with correct schema
CREATE OR REPLACE FUNCTION update_daily_stats_from_activity()
RETURNS TRIGGER AS $function$
DECLARE
  v_date DATE;
BEGIN
  v_date := DATE(NEW.created_at);
  
  -- Insert or update daily stats
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

-- Reattach the trigger
CREATE TRIGGER trigger_update_daily_stats
AFTER INSERT ON activity_log
FOR EACH ROW
EXECUTE FUNCTION update_daily_stats_from_activity();

-- Test query - check columns exist
SELECT 'activity_log columns:' as info;
SELECT column_name FROM information_schema.columns WHERE table_name = 'activity_log' ORDER BY ordinal_position;

SELECT 'daily_stats columns:' as info;
SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_stats' ORDER BY ordinal_position;

