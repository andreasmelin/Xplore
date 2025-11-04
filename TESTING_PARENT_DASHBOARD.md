# 🧪 Testing Parent Dashboard - Quick Guide

## 🎯 Test Checklist

### Pre-Test Setup
- [ ] Run database migration in Supabase SQL Editor
- [ ] Create a parent account (or log in)
- [ ] Create at least one child profile

### Activity Logging Tests

#### ✅ Test 1: Letter Tracing
1. Go to **Letters** mode
2. Select a letter (e.g., "A")
3. Trace the letter until completion
4. **Expected:** Activity logged with letter name and duration

#### ✅ Test 2: Math Game
1. Go to **Math** → **Comparing**
2. Complete all activities
3. See the celebration screen
4. **Expected:** Activity logged with score and duration

#### ✅ Test 3: Explore Lesson
1. Go to **Explore**
2. Select a topic (e.g., "Rymden")
3. Select a lesson
4. Read through to the end
5. **Expected:** Activity logged with topic and duration

#### ✅ Test 4: Chat with Sinus
1. Go to **Chat**
2. Send at least 3 messages
3. **Expected:** Each message counted in chat_messages

### Dashboard Verification

#### ✅ Test 5: View Dashboard
1. Click on your profile dropdown → **Parent Dashboard** (or go to `/parent`)
2. **Expected:** See summary statistics showing:
   - Total time spent
   - Activities completed
   - Letters practiced
   - Topics explored

#### ✅ Test 6: Charts
1. Scroll down to view charts
2. **Expected:** See a line chart with:
   - Minutes per day (blue line)
   - Activities per day (green line)

#### ✅ Test 7: Recent Activities
1. Scroll to "Senaste aktiviteter"
2. **Expected:** See list of activities you just completed with:
   - Activity type icon
   - Activity name
   - Duration
   - Timestamp

#### ✅ Test 8: Time Range Selector
1. Click on "7 dagar", "14 dagar", "30 dagar" buttons
2. **Expected:** Dashboard updates to show data for selected period

#### ✅ Test 9: Multi-Child Support
1. Create a second child profile
2. Do some activities with the second child
3. In dashboard, use profile selector dropdown
4. **Expected:** Dashboard shows data only for selected child

---

## 🔍 What to Look For

### ✅ Success Indicators
- Summary stats update immediately after activities
- Charts show activity over time
- Recent activities appear in correct order (newest first)
- Switching profiles shows different data
- No console errors

### ⚠️ Potential Issues
- **Dashboard empty:** Run migration or complete an activity
- **"Ingen data tillgänglig":** Activities done before today won't show in daily stats
- **Console errors:** Check that profile ID is being passed correctly

---

## 📊 Expected Data Flow

```
Child does activity
    ↓
Activity logger called (with profileId, activity details)
    ↓
activity_log table: New row inserted
    ↓
daily_stats table: Today's row updated (incremented)
    ↓
Parent visits dashboard
    ↓
Dashboard API fetches activity_log + daily_stats
    ↓
Data aggregated and displayed
```

---

## 🐛 Debugging Tips

### Check Activity Log Table
Go to Supabase Dashboard → Table Editor → `activity_log`

You should see rows like:
```
| profile_id | activity_type | activity_id | duration | completed | created_at |
|------------|---------------|-------------|----------|-----------|------------|
| abc-123... | letter        | A           | 45       | true      | 2025-...   |
| abc-123... | math          | comparing   | 120      | true      | 2025-...   |
```

### Check Daily Stats Table
Go to Supabase Dashboard → Table Editor → `daily_stats`

You should see rows like:
```
| profile_id | date       | total_time | activities | letters | topics | math | chat |
|------------|------------|------------|------------|---------|--------|------|------|
| abc-123... | 2025-10-28 | 165        | 3          | {A,B}   | {space}| 1    | 3    |
```

### Check Browser Console
Open DevTools (F12) → Console

Look for:
- ✅ `"Logged activity: ..."` (from activity-logger.ts)
- ❌ `"Failed to log activity: ..."` (indicates an error)

### Check Network Tab
Open DevTools (F12) → Network

Look for:
- `POST /api/parent/dashboard` - Should return 200 with dashboard data
- If 500 error, check response for error message

---

## 🎉 Success Criteria

Your parent dashboard is working correctly when:

1. ✅ All 4 activity types log successfully
2. ✅ Dashboard shows accurate summary statistics
3. ✅ Charts display activity trends
4. ✅ Recent activities list is populated
5. ✅ Switching profiles works correctly
6. ✅ Time range selector updates the view
7. ✅ No console errors
8. ✅ Data persists across page refreshes

---

## 💡 Demo Script (for showing to others)

> "Let me show you Xplore's parent dashboard. First, I'll have my child do some activities..."
> 
> *[Complete a letter, math game, and explore lesson]*
> 
> "Now, as a parent, I can see exactly what they've been learning..."
> 
> *[Navigate to /parent]*
> 
> "Here's the summary - they've spent 5 minutes today, completed 3 activities, practiced 1 letter..."
> 
> "And this chart shows their activity over the past week..."
> 
> "I can see their recent activities here - they just practiced letter A, played a comparing game, and learned about space."
> 
> "If I have multiple children, I can switch between them to see each child's progress individually."

---

Ready to test! 🚀






