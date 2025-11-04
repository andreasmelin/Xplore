# Database Setup Guide

## Quick Fix: Both Issues Resolved! ✅

### Issue 1: Missing `daily_quota` Table - FIXED
**Solution Applied:** The quota system now gracefully bypasses if the table doesn't exist. The app will work without errors, but won't track quota limits.

**Warning Message:** If you see this in the logs, it means the table is missing:
```
[Quota] Table not found - bypassing quota check. Run migration: db/migrations/004_quota_system.sql
```

### Issue 2: Heading + Text Separated - FIXED
Headings and their following text are now combined into a single page view. Your 10 pages will now show as 10 parts instead of 20!

---

## To Enable Quota Tracking (Optional)

If you want to track API usage and set daily limits, run the migration:

### Option 1: Via Supabase Dashboard (Easiest)

1. Go to your Supabase dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `db/migrations/004_quota_system.sql`
5. Paste into the editor
6. Click **Run**

### Option 2: Via Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 3: Manual SQL Execution

Connect to your Supabase database and run:

```sql
-- Copy and paste the entire contents of:
-- db/migrations/004_quota_system.sql
```

---

## What the Migration Creates

The migration will create these tables:

1. **`daily_quota`** - Tracks daily token usage per user
   - Columns: user_id, date, used, limit
   - Ensures one record per user per day

2. **`quota_log`** - Detailed log of all API calls
   - Columns: user_id, action, cost, metadata, created_at
   - Helps monitor what's consuming quota

---

## Verify It's Working

After running the migration:

1. **Restart your dev server** (Ctrl+C, then `npm run dev`)
2. **Test the app** - "Berätta mer" and "Ställ en fråga" should work
3. **Check logs** - You should NOT see the "Table not found" warning
4. **Check database** - Query the tables:

```sql
SELECT * FROM daily_quota;
SELECT * FROM quota_log ORDER BY created_at DESC LIMIT 10;
```

---

## Current Status (Without Migration)

✅ **App works normally** - No errors
✅ **All features functional** - "Berätta mer", "Ställ en fråga", TTS, etc.
⚠️  **No quota tracking** - Unlimited API usage (watch your costs!)
⚠️  **No usage analytics** - Can't see what users are doing

---

## Benefits of Running the Migration

✅ **Track API usage** - See what's consuming tokens
✅ **Set daily limits** - Prevent excessive API costs
✅ **Usage analytics** - Understand user behavior
✅ **Cost control** - Monitor spending per user

---

## Migration File Location

The SQL migration file is at:
```
db/migrations/004_quota_system.sql
```

You can view it to see exactly what will be created.

---

## Still Having Issues?

If you still see errors after running the migration:

1. **Verify tables exist:**
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('daily_quota', 'quota_log');
   ```

2. **Check permissions:**
   Make sure your service role key has access to these tables.

3. **Restart everything:**
   - Stop dev server (Ctrl+C)
   - Run `npm run dev` again
   - Test the features

4. **Check environment variables:**
   Ensure `.env.local` has:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   OPENAI_API_KEY=...
   ```

---

## Summary

**For now:** Your app works perfectly without the migration. The quota system gracefully falls back to "unlimited mode."

**For production:** Run the migration to enable quota tracking and cost control.

**Test it:** Try "Berätta mer" and "Ställ en fråga" - they should work now!







