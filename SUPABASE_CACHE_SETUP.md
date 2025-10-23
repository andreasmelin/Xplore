# Supabase Storage Cache Setup

## 🎯 Overview

This guide shows how to set up Supabase Storage buckets for caching audio and images.

---

## 📦 Step 1: Create Storage Buckets

### In Supabase Dashboard:

1. Go to **Storage** in left sidebar
2. Click **"New bucket"**

### Bucket 1: lesson-audio

**Settings:**
- Name: `lesson-audio`
- Public: ✅ **Yes** (for direct playback)
- File size limit: `10 MB`
- Allowed MIME types: `audio/mpeg, audio/mp3`

**Policies (RLS):**
```sql
-- Allow public read access
CREATE POLICY "Public read access for lesson audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lesson-audio');

-- Allow authenticated insert for generation
CREATE POLICY "Authenticated insert for lesson audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lesson-audio');

-- Allow service role full access
CREATE POLICY "Service role full access to lesson audio"
ON storage.objects
TO service_role
USING (bucket_id = 'lesson-audio')
WITH CHECK (bucket_id = 'lesson-audio');
```

### Bucket 2: lesson-images

**Settings:**
- Name: `lesson-images`
- Public: ✅ **Yes** (for direct display)
- File size limit: `5 MB`
- Allowed MIME types: `image/png, image/jpeg, image/webp`

**Policies (RLS):**
```sql
-- Allow public read access
CREATE POLICY "Public read access for lesson images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lesson-images');

-- Allow authenticated insert for generation
CREATE POLICY "Authenticated insert for lesson images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lesson-images');

-- Allow service role full access
CREATE POLICY "Service role full access to lesson images"
ON storage.objects
TO service_role
USING (bucket_id = 'lesson-images')
WITH CHECK (bucket_id = 'lesson-images');
```

---

## 📋 Step 2: Run Database Migration

Run the migration to create the `content_cache` table:

```sql
-- In Supabase SQL Editor, run:
-- db/migrations/003_content_cache.sql
```

Or use Supabase CLI:
```bash
supabase db push
```

---

## 🔑 Step 3: Verify Setup

### Check Buckets:
```sql
SELECT * FROM storage.buckets WHERE name IN ('lesson-audio', 'lesson-images');
```

Should return 2 rows.

### Check Table:
```sql
SELECT * FROM content_cache LIMIT 1;
```

Should work (even if empty).

---

## 🧪 Step 4: Test Upload

Test with Supabase client:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test audio upload
const { data, error } = await supabase.storage
  .from('lesson-audio')
  .upload('test/sample.mp3', audioBlob, {
    contentType: 'audio/mpeg',
    upsert: false,
  });

console.log('Upload result:', data, error);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('lesson-audio')
  .getPublicUrl('test/sample.mp3');

console.log('Public URL:', publicUrl);
```

---

## 📂 Folder Structure

Cache files organized as:

```
lesson-audio/
  ├─ solar-system/
  │   ├─ planets-intro/
  │   │   ├─ 0_abc123.mp3
  │   │   ├─ 1_def456.mp3
  │   │   └─ 2_ghi789.mp3
  │   └─ sun/
  │       └─ ...
  └─ dinosaurs/
      └─ ...

lesson-images/
  ├─ solar-system/
  │   ├─ planets-intro/
  │   │   └─ 2_xyz789.png
  │   └─ sun/
  │       └─ 1_abc123.png
  └─ ...
```

Filename format: `{contentIndex}_{hash}.{ext}`
- contentIndex: Position in lesson.content array
- hash: MD5 of source text/prompt (detects changes)

---

## 🔧 Environment Variables

Add to `.env.local`:

```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# No new vars needed! Uses existing Supabase config
```

---

## ✅ Verification Checklist

- [ ] `lesson-audio` bucket created
- [ ] `lesson-images` bucket created
- [ ] Both buckets are public
- [ ] RLS policies applied
- [ ] `content_cache` table created
- [ ] Test upload succeeds
- [ ] Public URL accessible
- [ ] Migration script run successfully

---

## 🚀 Ready!

Once setup is complete, the app will automatically:
1. Check cache before generating
2. Generate if missing
3. Store in Supabase Storage
4. Save metadata to database
5. Return cached URLs on future requests

**Instant playback + cost savings!** 💰


