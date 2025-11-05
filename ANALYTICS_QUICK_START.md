# Analytics System - Quick Start Checklist

## ✅ Setup Steps (5 minutes)

### 1. Run Database Migration
- [ ] Open Supabase Dashboard
- [ ] Go to SQL Editor
- [ ] Open `db/migrations/007_analytics_tracking.sql`
- [ ] Copy entire file contents
- [ ] Paste and run in SQL Editor
- [ ] Verify success message appears

### 2. Verify Environment Variables
- [ ] Open `.env` file
- [ ] Confirm these exist:
  ```
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  SUPABASE_SERVICE_ROLE_KEY=...
  ```

### 3. Restart Dev Server
```bash
# Stop server (Ctrl+C)
npm run dev
```

### 4. Test Tracking
- [ ] Open app in browser
- [ ] Navigate to a few pages
- [ ] Click some mode cards
- [ ] Wait 30 seconds
- [ ] Check Supabase → `analytics_events` table
- [ ] Should see rows appearing!

### 5. View Dashboard
- [ ] Navigate to `http://localhost:3000/analytics`
- [ ] Login if prompted
- [ ] Should see analytics dashboard

## 🎯 Using the System

### Daily/Weekly (passive)
Just let it run and collect data. No action needed.

### Weekly Check (2 minutes)
1. Visit `/analytics`
2. Quick glance at top features
3. Note any high abandonment (>50%)

### Monthly Review (30 minutes)
1. Visit `/analytics`
2. Download JSON export
3. Share with Claude: "Analyze this data and give me recommendations"
4. Make 1-2 changes based on insights

## 📊 What Gets Tracked Automatically

- ✅ Page views (home, explore, letters, math, chat)
- ✅ Mode card clicks
- ✅ Topic/lesson selections
- ✅ Feature usage duration
- ✅ Session length
- ✅ Feature completion/abandonment

## 🔍 Quick Checks

### Is it working?
```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM analytics_events;
-- Should be > 0 after using the app
```

### What's most popular?
```sql
SELECT * FROM get_feature_popularity(7, 10);
```

### Any problems?
```sql
SELECT * FROM get_abandonment_rates(7);
-- Look for rates > 50%
```

## 💡 Making Decisions

### If completion rate > 80%
**Expand this feature** - users love it!

### If abandonment rate > 50%
**Investigate or remove** - something's wrong

### If usage is high + completion is high
**This is your killer feature** - double down!

### If usage is low
**Not attracting users** - improve visibility or remove

## 🚨 Troubleshooting

### No events in database
1. Check browser console for errors
2. Verify migration ran (check if tables exist)
3. Confirm you're logged in when using app

### Dashboard shows no data
1. Wait 10-30 seconds (events batch before sending)
2. Refresh page
3. Check if data exists in database directly

### API errors
1. Verify `.env` has all required variables
2. Check `SUPABASE_SERVICE_ROLE_KEY` is correct
3. Restart dev server

## 📞 Need Help?

In this Claude chat, say:
- "Analytics isn't tracking" (for technical issues)
- "Help me interpret these analytics" (paste JSON)
- "What should I build next?" (for recommendations)

## 🎉 You're Done!

The system is now running and collecting valuable insights about your users. Come back in 1-2 weeks to start making data-driven decisions!

---

**Next Review Date**: _______________
**Focus Area**: _______________
