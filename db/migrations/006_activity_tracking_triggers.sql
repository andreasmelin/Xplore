-- Activity Tracking Triggers (Part 2 of 2)
-- Run this AFTER running 006_activity_tracking_simple.sql

-- Create the trigger function
CREATE OR REPLACE FUNCTION update_daily_stats_from_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
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
$function$;

-- Attach the trigger
DROP TRIGGER IF EXISTS trigger_update_daily_stats ON activity_log;
CREATE TRIGGER trigger_update_daily_stats
AFTER INSERT ON activity_log
FOR EACH ROW
EXECUTE FUNCTION update_daily_stats_from_activity();

-- Create summary function
CREATE OR REPLACE FUNCTION get_profile_summary(p_profile_id UUID, p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  total_time_seconds BIGINT,
  total_activities INTEGER,
  unique_letters INTEGER,
  unique_topics INTEGER,
  total_math INTEGER,
  total_chat INTEGER,
  average_score NUMERIC
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ds.total_time_seconds), 0)::BIGINT,
    COALESCE(SUM(ds.activities_completed), 0)::INTEGER,
    COUNT(DISTINCT unnested_letters)::INTEGER,
    COUNT(DISTINCT unnested_topics)::INTEGER,
    COALESCE(SUM(ds.math_activities), 0)::INTEGER,
    COALESCE(SUM(ds.chat_messages), 0)::INTEGER,
    AVG(ds.average_score)::NUMERIC
  FROM daily_stats ds
  LEFT JOIN LATERAL unnest(ds.letters_practiced) AS unnested_letters ON true
  LEFT JOIN LATERAL unnest(ds.topics_explored) AS unnested_topics ON true
  WHERE ds.profile_id = p_profile_id
  AND ds.date >= CURRENT_DATE - p_days
  GROUP BY ds.profile_id;
END;
$function$;






