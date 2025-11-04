# Supabase Setup - Step-by-Step Guide

## 🎯 Goal
Set up storage buckets and database for content caching.

---

## Step 1: Access Your Supabase Dashboard

1. Go to: **https://supabase.com/dashboard**
2. Log in to your account
3. Select your project (or create one if needed)
4. You should see your project dashboard

**✅ Ready?** Continue to Step 2.

---

## Step 2: Create Storage Buckets

### 2.1: Create `lesson-audio` Bucket

1. **Click "Storage"** in the left sidebar
2. **Click "New bucket"** button (top-right)
3. **Fill in the form:**
   - Name: `lesson-audio`
   - Public bucket: **✅ Check this box** (Important!)
   - File size limit: `10000000` (10 MB)
   - Allowed MIME types: Leave empty or add `audio/mpeg`
4. **Click "Create bucket"**

### 2.2: Create `lesson-images` Bucket

1. **Click "New bucket"** again
2. **Fill in the form:**
   - Name: `lesson-images`
   - Public bucket: **✅ Check this box** (Important!)
   - File size limit: `5000000` (5 MB)
   - Allowed MIME types: Leave empty or add `image/png`
3. **Click "Create bucket"**

**✅ You should now see 2 buckets in the Storage page.**

---

## Step 3: Set Storage Policies (RLS)

### 3.1: Open SQL Editor

1. **Click "SQL Editor"** in the left sidebar
2. **Click "New query"** button

### 3.2: Run Policy Script

**Copy this entire script and paste it:**

```sql
-- Allow public read access to lesson-audio
CREATE POLICY "Public read lesson-audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lesson-audio');

-- Allow authenticated users to insert audio
CREATE POLICY "Authenticated insert lesson-audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lesson-audio');

-- Allow public read access to lesson-images
CREATE POLICY "Public read lesson-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lesson-images');

-- Allow authenticated users to insert images
CREATE POLICY "Authenticated insert lesson-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lesson-images');
```

3. **Click "Run"** (or press Ctrl+Enter)
4. **You should see:** "Success. No rows returned"

**✅ Storage policies are now set!**

---

## Step 4: Create Database Table

### 4.1: Open a New Query

1. Still in **SQL Editor**
2. **Click "New query"** again

### 4.2: Run Migration Script

**Copy the ENTIRE content from:**
`db/migrations/003_content_cache.sql`

**Or copy this:**

```sql
-- Content Cache Table
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
  provider text,
  generation_params jsonb,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz NOT NULL DEFAULT now(),
  access_count bigint DEFAULT 0,
  
  -- Soft delete
  deleted_at timestamptz
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS content_cache_key_idx 
  ON public.content_cache(cache_key) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS content_cache_topic_lesson_idx 
  ON public.content_cache(topic_id, lesson_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS content_cache_type_idx 
  ON public.content_cache(content_type) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS content_cache_hash_idx 
  ON public.content_cache(content_hash);
```

3. **Click "Run"**
4. **You should see:** "Success. No rows returned"

**✅ Database table created!**

---

## Step 5: Verify Everything Works

### 5.1: Check Buckets

Run this query in SQL Editor:

```sql
SELECT * FROM storage.buckets 
WHERE name IN ('lesson-audio', 'lesson-images');
```

**Expected result:** 2 rows showing your buckets

### 5.2: Check Table

Run this query:

```sql
SELECT * FROM content_cache LIMIT 1;
```

**Expected result:** "Success. No rows returned" (table is empty but exists)

### 5.3: Check Policies

Run this query:

```sql
SELECT * FROM storage.policies 
WHERE bucket_id IN ('lesson-audio', 'lesson-images');
```

**Expected result:** 4 rows (2 policies per bucket)

**✅ Everything is set up correctly!**

---

## Step 6: Update Next.js Config (Already Done!)

The `next.config.ts` already allows Supabase images:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'oaidalleapiprodscus.blob.core.windows.net',
    },
  ],
}
```

**We need to add Supabase domain too!**

Find your Supabase URL in:
- Dashboard → Settings → API → Project URL
- It looks like: `https://xxxxxxxxxxxxx.supabase.co`

**I'll update the config for you in the next step.**

---

## Step 7: Test the Cache!

1. **Start your dev server:** `npm run dev`
2. **Open:** http://localhost:3000/explore
3. **Select a topic** (e.g., "Solsystemet")
4. **Open a lesson**
5. **Watch the browser console** - you should see:
   ```
   [TTS] Cache MISS: Generating new audio
   [TTS] Cached: audio/solar-system/planets-intro/0_abc123
   ```
6. **Refresh the page** and navigate to the same section
7. **Console should show:**
   ```
   [TTS] Cache HIT: audio/solar-system/planets-intro/0_abc123 ⚡
   ```

**🎉 Caching works!**

---

## Troubleshooting

### "Error: Bucket not found"
- Make sure buckets are public (check the checkbox during creation)
- Verify bucket names are exactly: `lesson-audio` and `lesson-images`

### "RLS policy error"
- Make sure you're running the policy script in SQL Editor
- Check that policies were created with the verification query

### "Table does not exist"
- Run the migration script again
- Check for any SQL errors in the output

### "Permission denied"
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is in your `.env.local`
- Restart your dev server after adding it

---

## 🎉 You're Done!

The caching system is now active. Every time content is generated:
1. It's stored in Supabase Storage
2. Metadata saved to database
3. Future requests are instant!

**Next:** Optionally pre-generate all content with:
```bash
npm run cache:generate
```

This will cache everything upfront so all users get instant playback from day 1!










