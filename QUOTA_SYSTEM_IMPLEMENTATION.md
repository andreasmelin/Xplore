# Token-Based Quota System Implementation

## 🎯 Overview

Implementing a fair usage system where:
- ✅ **Cached content is FREE** (images, audio) - no tokens consumed
- ⚠️ **API calls consume tokens** from daily quota
- 📊 **Rainbow bar decreases** as tokens are used
- 🔄 **Resets daily** - new quota each day

---

## 💰 Token Costs

| Action | Cost | Notes |
|--------|------|-------|
| Chat message | 1 token | GPT-4 conversation |
| "Berätta mer" | 1 token | AI expansions |
| "Ställ en fråga" | 1 token | AI questions |
| TTS (new) | 1 token | Text-to-speech generation |
| TTS (cached) | 0 tokens | **FREE!** Already generated |
| STT | 1 token | Speech-to-text |
| Image (new) | 3 tokens | DALL-E generation |
| Image (cached) | 0 tokens | **FREE!** Already generated |

**Daily Limit:** 100 tokens

---

## 📁 Files Created

### 1. **`src/lib/quota-manager.ts`** ✅
Core quota management system:
- `checkQuota()` - Check if user has enough tokens
- `consumeQuota()` - Consume tokens for an action
- `getQuotaStatus()` - Get current usage stats
- Works in Edge runtime

### 2. **`db/migrations/004_quota_system.sql`** ✅
Database schema:
- `daily_quota` table - Tracks daily usage per user
- `quota_log` table - Detailed log of all API calls
- Indexes and triggers

---

## 🔧 APIs Updated

### ✅ **TTS Cached API** (`/api/tts-cached`)
- Checks cache first
- If **cached**: Returns URL, **0 tokens** consumed
- If **not cached**: 
  - Consumes **1 token**
  - Generates audio
  - Caches for future use
- Returns `quotaConsumed` in response

### ⏳ **Still Need to Update:**

#### 1. **Image Generation** (`/api/explore/generate-image`)
```typescript
// Add quota check
if (userId && !cached) {
  const result = await consumeQuota(userId, QUOTA_COSTS.image, "image");
  if (!result.success) {
    return Response.json({ error: "Quota exceeded" }, { status: 429 });
  }
}
```

#### 2. **AI Assist** (`/api/explore/ai-assist`)
```typescript
const cost = mode === "tell-more" ? QUOTA_COSTS.tellMore : QUOTA_COSTS.askQuestion;
const result = await consumeQuota(userId, cost, mode);
```

#### 3. **Chat** (`/api/chat`)
```typescript
const result = await consumeQuota(userId, QUOTA_COSTS.chat, "chat");
```

#### 4. **STT** (`/api/stt`)
```typescript
const result = await consumeQuota(userId, QUOTA_COSTS.stt, "stt");
```

#### 5. **TTS Regular** (`/api/tts`)
```typescript
const result = await consumeQuota(userId, QUOTA_COSTS.tts, "tts");
```

---

## 🎨 Frontend Updates Needed

### 1. Update Quota Display
**File:** `src/app/explore/page.tsx`, `src/app/chat/page.tsx`, etc.

Change from:
```typescript
const limitsRes = await fetch("/api/limits/daily");
```

To:
```typescript
const limitsRes = await fetch("/api/quota/status");
// Returns: { used: 45, remaining: 55, limit: 100 }
```

### 2. Create `/api/quota/status` endpoint
```typescript
// src/app/api/quota/status/route.ts
import { getQuotaStatus } from "@/lib/quota-manager";

export async function GET(req: Request) {
  const userId = getUserIdFromCookies(req);
  const status = await getQuotaStatus(userId);
  return Response.json({ status });
}
```

### 3. Update AppHeader Rainbow Bar
**File:** `src/components/layout/AppHeader.tsx`

The quota bar already exists! Just needs to use new quota API:
```typescript
// Already shows percentage:
<div className="flex-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500" 
     style={{ width: `${percent}%` }} />

// Just update the fetch to use new quota endpoint
```

---

## 🎬 Setup Steps

### Step 1: Run Database Migration

In Supabase SQL Editor:
```sql
-- Run: db/migrations/004_quota_system.sql
```

### Step 2: Update Remaining APIs

Apply quota checks to:
- ✅ TTS Cached (Done)
- ⏳ Image Generation
- ⏳ AI Assist
- ⏳ Chat
- ⏳ STT
- ⏳ TTS Regular

### Step 3: Create Quota Status Endpoint

```bash
# Create: src/app/api/quota/status/route.ts
```

### Step 4: Update Frontend

- Change quota fetch endpoints
- Add quota consumed notifications
- Show "cached" indicators

---

## 📊 Example User Flow

### Scenario 1: First Time Viewing Lesson

**User clicks "Skapa bild":**
1. API checks cache → Not found
2. Checks quota → 100 tokens available
3. **Consumes 3 tokens** (image generation)
4. Generates image via DALL-E
5. Caches image to Supabase
6. Returns image URL
7. **Rainbow bar: 97/100** (97% remaining)

### Scenario 2: Second Time Viewing Same Lesson

**User clicks "Skapa bild":**
1. API checks cache → **Found!** ✅
2. Returns cached URL
3. **Consumes 0 tokens** (FREE!)
4. **Rainbow bar: 97/100** (unchanged)

### Scenario 3: Text-to-Speech

**First playback:**
- Generates audio → **1 token**
- Caches audio
- Rainbow bar: 96/100

**Second playback (refresh page):**
- Uses cache → **0 tokens**
- Rainbow bar: 96/100 (unchanged)

---

## 🚀 Benefits

1. **Fair Usage** - Prevents abuse while allowing normal use
2. **Rewards Efficiency** - Cached content is free!
3. **Cost Control** - Limits expensive API calls
4. **User Feedback** - Rainbow bar shows usage
5. **Encourages Exploration** - 100 tokens allows ~30 lessons/day
6. **Daily Reset** - Fresh start each day

---

## 📈 Usage Estimates

### Typical Day:

| Activity | Tokens | Count | Total |
|----------|--------|-------|-------|
| View 10 lessons (cached) | 0 | 10 | 0 |
| Generate 5 new images | 3 | 5 | 15 |
| "Berätta mer" 20 times | 1 | 20 | 20 |
| Chat 15 messages | 1 | 15 | 15 |
| Voice questions 10 times | 1 | 10 | 10 |
| **TOTAL** | | | **60** |

**Result:** Still has 40 tokens remaining!

---

## ⚠️ Important Notes

1. **Cache is Key** - Pre-generate popular content to save tokens
2. **User ID Required** - All API calls need authenticated user
3. **Edge Runtime** - Quota manager works in edge for speed
4. **Logging** - All usage logged in `quota_log` table
5. **Graceful Degradation** - If quota check fails, allow request (optional)

---

## 🔜 Next Steps

1. ✅ Complete API updates (remaining 5 endpoints)
2. ✅ Create quota status endpoint
3. ✅ Run database migration
4. ✅ Update frontend to show quota
5. ✅ Add "cached" indicators in UI
6. ✅ Test quota enforcement
7. ✅ Pre-generate common content to save tokens

---

## 🎯 Status

**Currently:** 20% complete
- ✅ Quota manager created
- ✅ Database schema designed
- ✅ TTS cached API updated
- ⏳ Remaining APIs need updates
- ⏳ Frontend needs updates

**Want me to continue and finish the implementation?** 🚀


