-- Content Cache Table
-- Tracks all cached audio and images for lessons

CREATE TABLE IF NOT EXISTS public.content_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content identification
  cache_key text UNIQUE NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('audio', 'image')),
  
  -- Source information
  topic_id text NOT NULL,
  lesson_id text NOT NULL,
  content_index int NOT NULL,
  
  -- Content hash (to detect when source changes)
  content_hash text NOT NULL,
  
  -- Storage information
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  
  -- Metadata
  file_size bigint,
  mime_type text,
  
  -- Generation metadata
  provider text, -- 'elevenlabs', 'openai-dalle', etc.
  generation_params jsonb, -- store the params used for generation
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz NOT NULL DEFAULT now(),
  access_count bigint DEFAULT 0,
  
  -- Soft delete (for cleanup without losing references)
  deleted_at timestamptz
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS content_cache_key_idx ON public.content_cache(cache_key) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS content_cache_topic_lesson_idx ON public.content_cache(topic_id, lesson_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS content_cache_type_idx ON public.content_cache(content_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS content_cache_hash_idx ON public.content_cache(content_hash);

-- Function to update access tracking
CREATE OR REPLACE FUNCTION update_cache_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed_at = now();
  NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update access stats (optional - can be done in application layer)
-- CREATE TRIGGER cache_access_trigger
-- BEFORE UPDATE ON public.content_cache
-- FOR EACH ROW
-- EXECUTE FUNCTION update_cache_access();

COMMENT ON TABLE public.content_cache IS 'Caches generated audio and images for lessons to reduce API costs and improve performance';
COMMENT ON COLUMN public.content_cache.cache_key IS 'Unique identifier: {type}/{topicId}/{lessonId}/{index}_{hash}';
COMMENT ON COLUMN public.content_cache.content_hash IS 'MD5 hash of source text/prompt to detect changes';









