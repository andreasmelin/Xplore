# Analytics System Guide

## Overview

The analytics system tracks user behavior, feature usage, and engagement across your learning app. This helps you understand which features are popular, where users spend time, and what to improve.

## What's Being Tracked

### Event Types

1. **page_view** - When users navigate to different pages
2. **feature_start** - When users begin using a feature
3. **feature_complete** - When users successfully complete a feature
4. **feature_abandon** - When users leave a feature without completing
5. **click** - Specific button/element interactions
6. **session_start** - When a user session begins
7. **session_end** - When a user session ends (30-min timeout or tab close)

### Features Currently Tracked

- **Home Page**: Mode card clicks (which modes users choose)
- **Explore Mode**: Topic selection, lesson viewing, lesson completion
- **Letters Mode**: Letter selection, tracing activities
- **Math Mode**: Comparing game activities
- **Chat Mode**: Chat interactions
- **All Pages**: Page views and session duration

## Database Schema

### Tables

1. **analytics_events** - Individual event records
   - profile_id, session_id, event_type, event_name
   - duration_ms, properties (JSONB), referrer
   - created_at

2. **analytics_sessions** - Grouped user sessions
   - profile_id, session_start, session_end
   - duration_seconds, features_used[]
   - events_count, page_views

3. **analytics_daily_summary** - Aggregated daily stats
   - date, profile_id, event_name
   - event_count, total_duration, avg_duration
   - completion_rate

## Getting Insights

### Method 1: API Endpoints

#### Get Summary Insights
```bash
GET /api/analytics/insights?days=7&format=summary
```

Returns top features, user flows, and high abandonment areas.

#### Get Detailed Analytics
```bash
GET /api/analytics/insights?days=7&format=detailed
```

Returns all analytics data including daily trends.

#### Get Export for AI Analysis
```bash
GET /api/analytics/insights?days=7&format=export
```

Returns data formatted for easy AI interpretation with automatic insights.

### Method 2: Direct Database Queries

#### Feature Popularity
```sql
SELECT * FROM get_feature_popularity(7, 10);
```

Returns:
- Most used features
- Unique user counts
- Average duration
- Completion rates

#### User Flows
```sql
SELECT * FROM get_user_flows(7, 20);
```

Returns:
- Common navigation patterns
- Feature-to-feature transitions
- Average time between transitions

#### Abandonment Analysis
```sql
SELECT * FROM get_abandonment_rates(7);
```

Returns:
- Features with high abandonment
- Start vs complete counts
- Abandonment percentages

#### Profile Engagement
```sql
SELECT * FROM get_profile_engagement('profile-uuid', 7);
```

Returns per-profile:
- Total sessions and events
- Most used feature
- Features tried count
- Last active timestamp

## Interpreting the Data

### High-Value Metrics

1. **Completion Rate** (>80% = good)
   - Indicates engaging, well-designed features
   - High completion = users find value

2. **Abandonment Rate** (<30% = good)
   - High abandonment = friction points
   - Investigate features >50% abandonment

3. **User Flows**
   - Common paths = intuitive design
   - Dead ends = navigation issues

4. **Time Spent**
   - Longer = more engagement
   - Too short = boring or confusing
   - Too long = might be stuck

### Red Flags

- **High abandonment** (>50%) - Feature is frustrating or confusing
- **Low usage** despite prominence - Feature doesn't appeal
- **Short duration** (<30s) - Feature is boring or broken
- **No repeat usage** - One-time use, not sticky

### Green Flags

- **High completion** (>80%) - Great feature
- **Frequent repeat usage** - Sticky feature
- **Long session durations** - Engaging content
- **Common in user flows** - Natural, intuitive navigation

## Examples: Making Decisions

### Scenario 1: Feature Popularity
```json
{
  "explore_mode": { "users": 85, "completion": 0.92 },
  "letters_mode": { "users": 52, "completion": 0.78 },
  "math_mode": { "users": 12, "completion": 0.45 },
  "chat_mode": { "users": 95, "completion": 0.88 }
}
```

**Interpretation:**
- ✅ Chat and Explore are winners - invest more here
- ⚠️ Math has low usage AND low completion - needs work or removal
- ✅ Letters is solid but could improve completion

**Actions:**
- Expand chat and explore features
- Fix or remove math mode
- Investigate why letters completion is lower

### Scenario 2: Abandonment Analysis
```json
{
  "letter_tracing_A": { "abandonment": 15% },
  "math_comparing": { "abandonment": 65% },
  "explore_lesson_planets": { "abandonment": 25% }
}
```

**Interpretation:**
- ✅ Letter tracing works great
- ❌ Math comparing has major issues (65% abandon!)
- ✅ Explore lessons decent

**Actions:**
- Study math comparing: Is it too hard? Buggy? Boring?
- Keep letters as-is
- Slightly improve explore lessons

### Scenario 3: User Flows
```json
[
  { "from": "home", "to": "chat_mode", "count": 450 },
  { "from": "home", "to": "explore_mode", "count": 320 },
  { "from": "home", "to": "letters_mode", "count": 180 },
  { "from": "chat_mode", "to": "explore_mode", "count": 95 },
  { "from": "home", "to": "math_mode", "count": 25 }
]
```

**Interpretation:**
- Chat is the #1 entry point - it's the killer feature
- Natural flow from chat → explore (good discovery)
- Math barely gets traffic from home

**Actions:**
- Promote chat more prominently
- Encourage chat → explore flow (it's working)
- Either improve math visibility or consider removing it

## Using AI to Analyze Data

### Step 1: Export Data
```bash
curl http://localhost:3000/api/analytics/insights?days=30&format=export > analytics.json
```

### Step 2: Ask AI
Prompt Claude (in this chat):
```
I've collected 30 days of analytics. Please analyze and tell me:
1. Which features should I expand?
2. Which features should I improve or remove?
3. What user patterns do you see?
4. What should I prioritize next?

[Paste analytics.json content]
```

### Step 3: Get Recommendations
AI will provide:
- Feature prioritization
- Specific improvement suggestions
- User behavior insights
- Development roadmap recommendations

## Quick Commands

### Run Database Migration
```bash
# In Supabase SQL Editor, run:
# db/migrations/007_analytics_tracking.sql
```

### Check Current Analytics
```javascript
// In browser console on any page:
fetch('/api/analytics/insights?days=7&format=export')
  .then(r => r.json())
  .then(d => console.log(d));
```

### Manual Event Tracking (if needed)
```typescript
import { analytics } from '@/lib/analytics/tracker';

// Track custom event
analytics.trackFeatureStart('custom_feature', 'interaction', {
  custom_property: 'value'
});

// Track completion
analytics.trackFeatureComplete('custom_feature', 5000, 'interaction', {
  score: 100
});
```

## Privacy & Data

- **Per-profile tracking**: Analytics tied to child profiles, not users
- **No PII**: No names, emails, or personal data in events
- **Retention**: Keep data as long as needed, can add cleanup scripts
- **Compliance**: Suitable for COPPA (children's privacy) as no PII collected

## Next Steps

1. ✅ Run the database migration
2. ✅ The tracking code is already integrated
3. ⏳ Let it run for 7-14 days to collect data
4. 📊 Review analytics insights
5. 🎯 Make data-driven decisions
6. 🔄 Iterate based on findings

## Support

If you need help interpreting data or making decisions:
1. Export the analytics JSON
2. Share it with Claude in this chat
3. Ask specific questions about what to do next

The system is designed to make it easy for AI to help you make product decisions based on real user behavior!
