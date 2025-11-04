# Troubleshooting Guide: "Utforska ämnen"

## 📁 Lesson Data Files

**Main file with all lesson content:**
- `src/lib/explore/topics-data.ts`
  - Contains 6 topics with ~10 pages each
  - Each page has ~5 sentences
  - All images removed (can be re-added via `type: "image"`)

## 🎵 Pre-generating Audio to Avoid API Costs

### Script Location
`scripts/pre-generate-lesson-content.ts`

### How to Run

```bash
# Generate ALL audio for all lessons (recommended after editing texts)
npx ts-node scripts/pre-generate-lesson-content.ts --audio-only

# Generate for a specific topic only
npx ts-node scripts/pre-generate-lesson-content.ts --audio-only --topic=solar-system

# Generate for a specific lesson
npx ts-node scripts/pre-generate-lesson-content.ts --audio-only --topic=solar-system --lesson=planets-intro
```

### What It Does
1. ✅ Reads all lesson content from `topics-data.ts`
2. ✅ Generates TTS audio for each text/heading/fact
3. ✅ Stores audio files in Supabase storage
4. ✅ Caches metadata in database
5. ✅ Skips already cached content (re-run safe)
6. ✅ Shows cost estimate at the end

### Result
- **Normal lesson viewing**: Uses cached audio (no API cost)
- **"Berätta mer" button**: Generates new AI response (costs quota)
- **"Ställ en fråga" button**: Generates new AI response (costs quota)

---

## 🐛 Issues Fixed

### Bug #1: TTS API Error ✅ FIXED
**Problem:** OpenAI TTS endpoint was called with wrong parameters:
- Used `model: "gpt-4o-mini-tts"` (doesn't exist)
- Used `format` instead of `response_format`

**Fixed in:**
- `src/app/api/tts/route.ts` (line 80, 83)
- `src/app/api/tts-cached/route.ts` (line 133, 136)

**Changed:**
```typescript
// Before (WRONG)
model: "gpt-4o-mini-tts",
format,

// After (CORRECT)
model: "tts-1",
response_format: format,
```

---

## 🔍 Troubleshooting Plan for "Berätta mer" and "Ställ en fråga"

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Click "Berätta mer" button
4. Look for error messages

**Common errors to look for:**
- `Failed to fetch` - Network/CORS issue
- `401/403` - API key problem
- `429` - Quota exceeded
- `500` - Server error

### Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Click the button
3. Find the request to `/api/explore/ai-assist`
4. Click on it to see:
   - Request payload
   - Response status
   - Response body

### Step 3: Check Environment Variables
Ensure these are set in `.env.local`:

```bash
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...  # If using ElevenLabs TTS
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Step 4: Check Server Logs
Look at the terminal where `npm run dev` is running.

**Look for:**
```
AI assist error: ...
OpenAI API error: ...
TTS error: ...
```

### Step 5: Test API Endpoints Directly

#### Test OpenAI API:
```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

#### Test TTS API:
```bash
curl http://localhost:3001/api/tts \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Test",
    "provider": "openai"
  }' \
  --output test.mp3
```

### Step 6: Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Missing OPENAI_API_KEY" | API key not set | Add to `.env.local` |
| "Daily quota exceeded" | User hit limit | Wait 24h or increase quota |
| "Failed to generate response" | OpenAI API error | Check API key validity |
| "Network error" | CORS/connection | Check if dev server running |
| No audio plays | TTS endpoint error | Check TTS API logs |

### Step 7: Verify Component Code

Check `src/components/explore/LessonViewer.tsx`:
- Line 124: `handleTellMore` function
- Line 288: `handleAskQuestion` function
- Line 184: `generateExpansionAudio` function
- Line 336: `generateQuestionAudio` function

### Step 8: Check Database
If using Supabase:
1. Go to Supabase dashboard
2. Check `quota_usage` table for quota limits
3. Check `content_cache` table for cached content

---

## ✅ Verification Checklist

After fixing, verify:
- [ ] "Berätta mer" button shows loading spinner
- [ ] AI response appears after ~2-3 seconds
- [ ] Audio plays automatically
- [ ] Can click multiple times for deeper info
- [ ] "Ställ en fråga" shows input field
- [ ] Can type or record a question
- [ ] Answer appears and plays audio
- [ ] Pre-generated lesson audio plays instantly
- [ ] No errors in console

---

## 📊 Monitoring Costs

### Check What's Consuming Quota:
```sql
SELECT 
  action_type,
  COUNT(*) as count,
  SUM(cost_amount) as total_cost
FROM quota_usage
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY action_type
ORDER BY total_cost DESC;
```

### Expected Costs:
- **Lesson viewing** (pre-generated): 0 tokens
- **"Berätta mer"**: 1 token per click
- **"Ställ en fråga"**: 1 token per question
- **TTS** (if not cached): 1 token per audio generation

---

## 🆘 Still Not Working?

1. **Restart dev server**: Stop (Ctrl+C) and run `npm run dev` again
2. **Clear cache**: Delete `.next` folder and restart
3. **Check logs**: Look for errors in terminal
4. **Test with simple lesson**: Try a short text to isolate issue
5. **Verify API keys**: Test them directly with curl

## Contact
If issues persist, share:
- Browser console errors (screenshot)
- Server terminal logs
- Network tab screenshot showing failed request
- `.env.local` structure (WITHOUT actual keys!)







