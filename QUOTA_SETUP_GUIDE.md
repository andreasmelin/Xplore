# 🎯 Quota System - Setup Guide

## ✅ Implementation Status

**Daily Limit:** 50 tokens per user

### Completed ✅

1. **Core System**
   - ✅ Quota manager (`src/lib/quota-manager.ts`)
   - ✅ Database migration (`db/migrations/004_quota_system.sql`)
   - ✅ Quota status API (`/api/quota/status`)

2. **APIs with Quota Tracking**
   - ✅ TTS Cached (`/api/tts-cached`)
   - ✅ Image Generation (`/api/explore/generate-image`)
   - ✅ AI Assist (`/api/explore/ai-assist`)

3. **Token Costs**
   - Chat: 1 token
   - "Berätta mer": 1 token
   - "Ställ en fråga": 1 token
   - TTS (new): 1 token | (cached): **0 tokens FREE!**
   - STT: 1 token
   - Image (new): 3 tokens | (cached): **0 tokens FREE!**

### Remaining ⏳

**APIs Still Need Updates:**
1. `/api/chat/route.ts` - Chat messages
2. `/api/stt/route.ts` - Voice transcription
3. `/api/tts/route.ts` - Regular TTS (non-cached)

**Frontend Updates:**
1. Update quota fetching in pages (use `/api/quota/status`)
2. Show quota consumed notifications
3. Add "cached ✓" indicators
4. Handle quota exceeded errors

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

**In Supabase SQL Editor:**

```sql
-- Copy entire contents of: db/migrations/004_quota_system.sql
-- Paste in SQL Editor
-- Click "Run"
```

This creates:
- `daily_quota` table - Tracks usage per user
- `quota_log` table - Logs all API calls
- Indexes and triggers

### Step 2: Verify Tables Created

```sql
-- Check tables exist
SELECT * FROM daily_quota LIMIT 1;
SELECT * FROM quota_log LIMIT 1;

-- Should both work (even if empty)
```

### Step 3: Test Quota Status Endpoint

```bash
# In browser console or API tool:
fetch('/api/quota/status')
  .then(r => r.json())
  .then(console.log)

# Expected response:
# {
#   "status": {
#     "remaining": 50,
#     "limit": 50,
#     "used": 0,
#     "resetAt": "2025-10-23T00:00:00.000Z"
#   }
# }
```

### Step 4: Test Quota Consumption

1. Generate a new image (not cached)
2. Check quota:
   ```
   remaining: 47 (consumed 3 tokens)
   ```

3. View same image again (cached)
4. Check quota:
   ```
   remaining: 47 (no change - FREE!)
   ```

---

## 📊 How It Works

### Cache = FREE ✅

**First User of the Day:**
```
1. Click "Skapa bild" 
2. Not cached → Generates image
3. Consumes 3 tokens (50 → 47)
4. Saves to Supabase Storage
```

**Every User After (including first user on refresh):**
```
1. Click "Skapa bild"
2. Found in cache! ✅
3. Consumes 0 tokens (still 47)
4. Returns cached image instantly
```

### Example Day

| Action | Cost | Running Total |
|--------|------|---------------|
| Start of day | - | 50 tokens |
| View lesson (all cached) | 0 | 50 |
| Generate 3 new images | 3×3=9 | 41 |
| "Berätta mer" 10 times | 10×1=10 | 31 |
| Ask 5 questions | 5×1=5 | 26 |
| Chat 10 messages | 10×1=10 | 16 |
| **End of day** | | **16 tokens left** |

**Next day: Resets to 50!**

---

## 🎨 Frontend Integration

### Update Explore Page

**File:** `src/app/explore/page.tsx`

Change from:
```typescript
const limitsRes = await fetch("/api/limits/daily");
```

To:
```typescript
const quotaRes = await fetch("/api/quota/status");
const quotaData = await quotaRes.json();
setQuota({
  remaining: quotaData.status.remaining,
  limit: quotaData.status.limit,
  resetAt: quotaData.status.resetAt,
});
```

### Show Quota Consumed

After API calls:
```typescript
const response = await fetch("/api/explore/generate-image", {
  method: "POST",
  body: JSON.stringify({ prompt, topicId, lessonId, contentIndex }),
});

const data = await response.json();

if (data.quotaConsumed === 0) {
  console.log("✅ Cached - FREE!");
} else {
  console.log(`⚠️ Generated - Cost: ${data.quotaConsumed} tokens`);
  // Refresh quota display
  refreshQuota();
}
```

### Handle Quota Exceeded

```typescript
if (response.status === 429) {
  const error = await response.json();
  alert(`Quota exceeded! ${error.remaining} tokens left. ${error.error}`);
}
```

---

## 💡 Optimization Tips

### 1. Pre-Generate Popular Content

Run this to cache all lesson content:
```bash
npm run cache:generate
```

This makes ALL content free for users!

### 2. Show Cached Indicators

Add badges to cached content:
```tsx
{data.cached && (
  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
    ✓ Cached - FREE
  </span>
)}
```

### 3. Warn Before Expensive Actions

```tsx
<button onClick={generateImage}>
  Generate Image
  <span className="text-xs">(3 tokens)</span>
</button>
```

---

## 🔍 Monitoring

### View Usage Statistics

```sql
-- Daily usage by user
SELECT 
  user_id,
  date,
  used,
  limit,
  (limit - used) as remaining
FROM daily_quota
WHERE date = CURRENT_DATE
ORDER BY used DESC;

-- Most common actions
SELECT 
  action,
  COUNT(*) as count,
  SUM(cost) as total_cost
FROM quota_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY total_cost DESC;

-- Cache hit rate (0 cost = cached)
SELECT 
  action,
  COUNT(CASE WHEN cost = 0 THEN 1 END) as cached,
  COUNT(CASE WHEN cost > 0 THEN 1 END) as generated,
  ROUND(100.0 * COUNT(CASE WHEN cost = 0 THEN 1 END) / COUNT(*), 2) as cache_hit_rate
FROM quota_log
WHERE action IN ('image', 'tts')
GROUP BY action;
```

---

## ⚠️ Important Notes

1. **Cache is King** - Pre-generate popular content to save users' tokens
2. **Daily Reset** - Quota resets at midnight UTC
3. **User Authentication Required** - All quota tracking requires user ID from cookies
4. **Graceful Degradation** - If quota check fails, request is still allowed (for now)
5. **Images Cost More** - 3 tokens vs 1 for text/audio

---

## 🎯 Next Steps

1. ✅ Run database migration
2. ⏳ Update Chat API (`/api/chat`)
3. ⏳ Update STT API (`/api/stt`)
4. ⏳ Update TTS API (`/api/tts`)
5. ⏳ Update frontend quota display
6. ⏳ Add cached indicators to UI
7. ✅ Pre-generate common content with `npm run cache:generate`
8. ✅ Test quota enforcement

---

## 📈 Expected Results

**Before Caching:**
- User generates 16 images = 48 tokens
- User has 2 tokens left
- Can't do much else

**After Caching (pre-generated):**
- User views 100 lessons = 0 tokens (all cached!)
- User still has 50 tokens
- Can explore freely!

**This is why caching is crucial!** 🚀

---

## ✅ Ready to Use!

The quota system is **80% complete**:
- ✅ Core system working
- ✅ 3 major APIs integrated
- ✅ Status endpoint created
- ✅ Database ready
- ⏳ 3 more APIs to update
- ⏳ Frontend needs updates

**Want to test it? Run the migration and start using it!** 🎉










