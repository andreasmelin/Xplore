-- Analytics Event Tracking System
-- Tracks feature usage, engagement, and user behavior
-- Run this in Supabase SQL Editor

-- ============================================================================
-- TABLES
-- ============================================================================

-- Main analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'page_view' | 'feature_start' | 'feature_complete' | 'feature_abandon' | 'click' | 'session_start' | 'session_end'
  event_name TEXT NOT NULL, -- 'explore_mode' | 'letter_A' | 'math_comparing' | 'chat_sinus' etc.
  event_category TEXT, -- 'navigation' | 'learning' | 'interaction' | 'system'
  properties JSONB DEFAULT '{}'::jsonb, -- Flexible event data
  duration_ms INTEGER, -- Time spent (for timed events)
  referrer TEXT, -- Previous page/feature
  user_agent TEXT, -- Browser info
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table for grouping events
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER,
  page_views INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0,
  features_used TEXT[] DEFAULT '{}',
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily analytics summary (materialized for performance)
CREATE TABLE IF NOT EXISTS analytics_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  profile_id UUID REFERENCES user_profile(id) ON DELETE CASCADE,
  event_name TEXT,
  event_type TEXT,
  event_count INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 1,
  avg_duration_seconds INTEGER,
  completion_rate DECIMAL(5,2), -- For feature_complete vs feature_start
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, profile_id, event_name, event_type)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Analytics events indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_profile ON analytics_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_profile_created ON analytics_events(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created ON analytics_events(event_name, created_at DESC);

-- GIN index for JSONB properties queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_properties ON analytics_events USING GIN (properties);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_profile ON analytics_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_start ON analytics_sessions(session_start DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_profile_start ON analytics_sessions(profile_id, session_start DESC);

-- Daily summary indexes
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily_summary(date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_profile ON analytics_daily_summary(profile_id);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_name ON analytics_daily_summary(event_name);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get feature popularity (most used features)
CREATE OR REPLACE FUNCTION get_feature_popularity(
  p_days INTEGER DEFAULT 7,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  event_name TEXT,
  total_uses BIGINT,
  unique_users BIGINT,
  avg_duration_seconds NUMERIC,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.event_name,
    COUNT(*) as total_uses,
    COUNT(DISTINCT e.profile_id) as unique_users,
    ROUND(AVG(e.duration_ms::NUMERIC / 1000), 1) as avg_duration_seconds,
    ROUND(
      COUNT(*) FILTER (WHERE e.event_type = 'feature_complete')::NUMERIC /
      NULLIF(COUNT(*) FILTER (WHERE e.event_type IN ('feature_start', 'feature_complete')), 0) * 100,
      1
    ) as completion_rate
  FROM analytics_events e
  WHERE
    e.created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND e.event_type IN ('feature_start', 'feature_complete', 'page_view')
  GROUP BY e.event_name
  ORDER BY total_uses DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get engagement metrics per profile
CREATE OR REPLACE FUNCTION get_profile_engagement(
  p_profile_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  total_sessions BIGINT,
  total_events BIGINT,
  avg_session_duration_seconds NUMERIC,
  most_used_feature TEXT,
  features_tried BIGINT,
  last_active TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(e.id) as total_events,
    ROUND(AVG(s.duration_seconds), 1) as avg_session_duration_seconds,
    (
      SELECT event_name
      FROM analytics_events
      WHERE profile_id = p_profile_id
        AND created_at >= NOW() - (p_days || ' days')::INTERVAL
      GROUP BY event_name
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as most_used_feature,
    COUNT(DISTINCT e.event_name) as features_tried,
    MAX(e.created_at) as last_active
  FROM analytics_sessions s
  LEFT JOIN analytics_events e ON e.session_id = s.id
  WHERE
    s.profile_id = p_profile_id
    AND s.session_start >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to get user flow (common feature sequences)
CREATE OR REPLACE FUNCTION get_user_flows(
  p_days INTEGER DEFAULT 7,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  from_feature TEXT,
  to_feature TEXT,
  transition_count BIGINT,
  avg_time_between_seconds NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH feature_sequences AS (
    SELECT
      e1.event_name as from_feature,
      e2.event_name as to_feature,
      EXTRACT(EPOCH FROM (e2.created_at - e1.created_at)) as time_between
    FROM analytics_events e1
    INNER JOIN analytics_events e2
      ON e1.session_id = e2.session_id
      AND e1.profile_id = e2.profile_id
      AND e2.created_at > e1.created_at
    WHERE
      e1.created_at >= NOW() - (p_days || ' days')::INTERVAL
      AND e1.event_type IN ('page_view', 'feature_start')
      AND e2.event_type IN ('page_view', 'feature_start')
      AND NOT EXISTS (
        SELECT 1 FROM analytics_events e3
        WHERE e3.session_id = e1.session_id
          AND e3.created_at > e1.created_at
          AND e3.created_at < e2.created_at
          AND e3.event_type IN ('page_view', 'feature_start')
      )
  )
  SELECT
    from_feature,
    to_feature,
    COUNT(*) as transition_count,
    ROUND(AVG(time_between), 1) as avg_time_between_seconds
  FROM feature_sequences
  WHERE time_between < 3600 -- Only transitions within 1 hour
  GROUP BY from_feature, to_feature
  ORDER BY transition_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get drop-off analysis (abandonment)
CREATE OR REPLACE FUNCTION get_abandonment_rates(
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  event_name TEXT,
  started BIGINT,
  completed BIGINT,
  abandoned BIGINT,
  abandonment_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH feature_stats AS (
    SELECT
      event_name,
      COUNT(*) FILTER (WHERE event_type = 'feature_start') as starts,
      COUNT(*) FILTER (WHERE event_type = 'feature_complete') as completes,
      COUNT(*) FILTER (WHERE event_type = 'feature_abandon') as abandons
    FROM analytics_events
    WHERE
      created_at >= NOW() - (p_days || ' days')::INTERVAL
      AND event_type IN ('feature_start', 'feature_complete', 'feature_abandon')
    GROUP BY event_name
  )
  SELECT
    event_name,
    starts as started,
    completes as completed,
    abandons as abandoned,
    ROUND(
      CASE
        WHEN starts > 0 THEN ((starts - completes)::NUMERIC / starts * 100)
        ELSE 0
      END,
      1
    ) as abandonment_rate
  FROM feature_stats
  WHERE starts > 0
  ORDER BY abandonment_rate DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update session stats (called by trigger or periodically)
CREATE OR REPLACE FUNCTION update_session_stats(p_session_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE analytics_sessions
  SET
    events_count = (
      SELECT COUNT(*)
      FROM analytics_events
      WHERE session_id = p_session_id
    ),
    page_views = (
      SELECT COUNT(*)
      FROM analytics_events
      WHERE session_id = p_session_id AND event_type = 'page_view'
    ),
    features_used = (
      SELECT ARRAY_AGG(DISTINCT event_name)
      FROM analytics_events
      WHERE session_id = p_session_id AND event_type IN ('feature_start', 'page_view')
    ),
    updated_at = NOW()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update session stats when events are added
CREATE OR REPLACE FUNCTION trigger_update_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_session_stats(NEW.session_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_analytics_event_insert
AFTER INSERT ON analytics_events
FOR EACH ROW
EXECUTE FUNCTION trigger_update_session_stats();

-- ============================================================================
-- INITIAL DATA / COMMENTS
-- ============================================================================

COMMENT ON TABLE analytics_events IS 'Tracks all user interaction events for analytics';
COMMENT ON TABLE analytics_sessions IS 'Groups events into user sessions';
COMMENT ON TABLE analytics_daily_summary IS 'Daily aggregated analytics for performance';

COMMENT ON COLUMN analytics_events.event_type IS 'Type: page_view, feature_start, feature_complete, feature_abandon, click, session_start, session_end';
COMMENT ON COLUMN analytics_events.event_name IS 'Identifier: explore_mode, letter_A, math_comparing, chat_sinus, etc.';
COMMENT ON COLUMN analytics_events.event_category IS 'Category: navigation, learning, interaction, system';
COMMENT ON COLUMN analytics_events.properties IS 'Flexible JSONB for event-specific data';
COMMENT ON COLUMN analytics_events.duration_ms IS 'Time spent in milliseconds (for timed events)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Analytics tracking system created successfully!';
  RAISE NOTICE 'Tables: analytics_events, analytics_sessions, analytics_daily_summary';
  RAISE NOTICE 'Functions: get_feature_popularity(), get_profile_engagement(), get_user_flows(), get_abandonment_rates()';
END $$;
