# 💳 Stripe Payment & Parent Dashboard Setup Guide

This guide walks you through setting up Stripe payments and the parent dashboard for Xplore.

## 📋 Prerequisites

- Stripe account (sign up at https://stripe.com)
- Supabase project with database access
- Node.js and npm installed

## 🗄️ Step 1: Database Setup

### Run the migrations

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run these migrations in order:

```sql
-- First, run: db/migrations/005_subscriptions.sql
-- Then run: db/migrations/006_activity_tracking.sql
```

These create the tables for:
- `subscriptions` - Stripe subscription data
- `activity_log` - Detailed activity tracking
- `daily_stats` - Aggregated daily statistics

## 🔐 Step 2: Stripe Account Setup

### 1. Create Stripe Account

1. Go to https://dashboard.stripe.com/register
2. Complete registration
3. Activate your account

### 2. Get API Keys

1. In Stripe Dashboard, go to **Developers** → **API Keys**
2. Copy your keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### 3. Create Products & Prices

In Stripe Dashboard, go to **Products** → **Add Product**

**Create 3 products:**

#### Product 1: Xplore Starter
```
Name: Xplore Starter
Description: Perfect for one child
Pricing:
  - Monthly: 79 SEK (recurring monthly)
  - Yearly: 790 SEK (recurring yearly)
```

#### Product 2: Xplore Family (mark as featured)
```
Name: Xplore Familj  
Description: Most popular for families
Pricing:
  - Monthly: 149 SEK (recurring monthly)
  - Yearly: 1,490 SEK (recurring yearly)
```

#### Product 3: Xplore Premium
```
Name: Xplore Premium
Description: For larger families and preschools
Pricing:
  - Monthly: 249 SEK (recurring monthly)
  - Yearly: 2,490 SEK (recurring yearly)
```

**Important:** Copy each Price ID (starts with `price_`) - you'll need these!

### 4. Set up Webhooks

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Webhook signing secret** (starts with `whsec_`)

## ⚙️ Step 3: Environment Variables

Create or update your `.env.local` file:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from products you created)
NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEARLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_FAMILY_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_FAMILY_YEARLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY=price_...

# App URL (use your actual domain in production)
NEXT_PUBLIC_URL=http://localhost:3000
```

## 🧪 Step 4: Test the Integration

### 1. Start your development server

```bash
npm run dev
```

### 2. Test payment flow

1. Navigate to `http://localhost:3000/pricing`
2. Click "Börja gratis" on any plan
3. Use Stripe test card: `4242 4242 4242 4242`
4. Expiry: any future date (e.g., 12/34)
5. CVC: any 3 digits (e.g., 123)
6. Complete checkout

### 3. Verify subscription

1. Check Stripe Dashboard → Customers
2. Check Stripe Dashboard → Subscriptions
3. Check your Supabase `subscriptions` table

### 4. Test webhooks locally

Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

In another terminal:
```bash
stripe trigger checkout.session.completed
```

## 📊 Step 5: Test Parent Dashboard

### 1. Log activity

The dashboard needs activity data. You can either:

**Option A: Use the app naturally**
- Complete letters, math games, explore lessons
- Chat with Sinus
- Activity automatically logs

**Option B: Insert test data manually**

```sql
-- Insert test activity in Supabase SQL Editor
INSERT INTO activity_log (profile_id, activity_type, activity_id, activity_name, duration_seconds, completed)
VALUES 
  ('your-profile-id', 'letter', 'letter_a', 'Bokstav A', 180, true),
  ('your-profile-id', 'math', 'comparing_1', 'Jämföra antal', 240, true),
  ('your-profile-id', 'explore', 'dinosaurs_intro', 'Dinosaurier', 600, true);
```

### 2. View dashboard

1. Navigate to `http://localhost:3000/parent`
2. Select a profile
3. View stats, charts, and recent activities

## 🚀 Step 6: Deploy to Production

### 1. Update environment variables in Vercel

In Vercel Dashboard → Project → Settings → Environment Variables:
- Add all Stripe variables
- Use **production** Stripe keys (not test keys!)
- Update `NEXT_PUBLIC_URL` to your domain

### 2. Update Stripe webhook URL

1. In Stripe Dashboard → Developers → Webhooks
2. Add new endpoint: `https://your-production-domain.com/api/stripe/webhook`
3. Update `STRIPE_WEBHOOK_SECRET` in Vercel

### 3. Test on production

- Test with real payment flow
- Verify webhooks are working
- Check subscription creation

## 🎯 What Users Can Now Do

### For Parents:

✅ **Subscribe to a plan**
- Visit `/pricing`
- Choose plan
- 7-day free trial
- Enter payment details

✅ **Manage subscription**
- Visit `/subscription`
- View current plan
- Update payment method
- Cancel subscription

✅ **View child's progress**
- Visit `/parent`
- See time spent learning
- View completed activities
- Track skill progression
- Monitor streaks

### For You (Admin):

✅ **Track revenue**
- View in Stripe Dashboard
- See MRR growth
- Monitor churn

✅ **Monitor usage**
- Parent dashboard shows engagement
- Daily stats in database
- Activity logs

## 🐛 Troubleshooting

### Webhook not working

**Check:**
1. Webhook URL is correct
2. Webhook secret matches
3. Endpoint is returning 200 status
4. Events are selected in Stripe

**Debug:**
```bash
# Check webhook logs in Stripe Dashboard
# Check Next.js logs
# Use Stripe CLI to test locally
```

### Payment not completing

**Check:**
1. Stripe keys are correct (test vs production)
2. Price IDs are correct
3. Customer creation is working
4. Check browser console for errors

### Dashboard not showing data

**Check:**
1. Migrations ran successfully
2. Activity logging is working
3. Profile ID is correct
4. Database permissions are set

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Supabase SQL](https://supabase.com/docs/guides/database)

## 🎉 You're Done!

Your Xplore app now has:
- ✅ Complete payment system
- ✅ Subscription management
- ✅ Parent dashboard
- ✅ Activity tracking
- ✅ Progress reports

Start driving traffic to `/pricing` and convert users! 🚀






