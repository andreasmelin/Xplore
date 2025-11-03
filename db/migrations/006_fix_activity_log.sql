-- Fix activity_log table - add missing column if needed
-- Run this in your Supabase SQL editor

-- Add activity_name column if it doesn't exist
ALTER TABLE activity_log 
ADD COLUMN IF NOT EXISTS activity_name TEXT;

-- Verify the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_log'
ORDER BY ordinal_position;

