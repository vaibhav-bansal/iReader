# Subscription Checkout Implementation Plan

Executive summary of implementing subscription functionality with Dodo Payments integration.

---

## Overview

Enable users to purchase Pro ($4.99/month) or Plus ($9.99/month) subscriptions through Dodo Payments, with subscription status stored in Supabase and enforced throughout the application.

---

## 1. Database Changes (Supabase)

### New Table: `subscriptions`
Track user subscription status and history.

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `tier` (text: 'free', 'pro', 'plus')
- `status` (text: 'active', 'cancelled', 'expired', 'trialing')
- `dodo_subscription_id` (text, nullable)
- `dodo_customer_id` (text, nullable)
- `current_period_start` (timestamp)
- `current_period_end` (timestamp)
- `cancel_at_period_end` (boolean, default false)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Policies:**
- Users can read their own subscription data
- Only service role can write subscription data (for webhooks)

### New Table: `payments`
Track all payment transactions for audit and history.

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `subscription_id` (uuid, foreign key to subscriptions, nullable)
- `dodo_payment_id` (text, unique)
- `dodo_subscription_id` (text, nullable)
- `amount` (numeric, e.g., 4.99)
- `currency` (text, default 'USD')
- `status` (text: 'pending', 'succeeded', 'failed', 'refunded')
- `payment_method` (text, e.g., 'card', 'paypal')
- `failure_reason` (text, nullable)
- `metadata` (jsonb, stores additional Dodo webhook data)
- `paid_at` (timestamp, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Policies:**
- Users can read their own payment history
- Only service role can write payment data (for webhooks)

**Indexes:**
- Index on `user_id` for fast user payment history queries
- Index on `dodo_payment_id` for webhook lookups
- Index on `subscription_id` for linking payments to subscriptions

### New Table: `subscription_usage`
Track feature usage for enforcement (AI summaries, storage, etc.).

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `feature` (text: 'ai_summaries', 'storage_mb', etc.)
- `usage_count` (integer)
- `reset_at` (timestamp)
- `created_at` (timestamp)
- `updated_at` (timestamp)

---

## 2. New Files to Create

### `/src/components/SubscriptionModal.jsx`
Modal component for displaying subscription plans and initiating checkout.
- Shows Free, Pro, Plus tiers with feature comparison
- "Upgrade" button for each tier
- Calls Dodo Payments checkout on click

### `/src/components/SubscriptionBadge.jsx`
Display user's current subscription tier (Free/Pro/Plus badge).
- Used in Library page header
- Shows tier and expiry date

### `/src/pages/Subscription.jsx`
Full subscription management page.
- Current plan details
- Upgrade/downgrade options
- Cancel subscription
- View billing history
- Manage payment method

### `/src/lib/dodoPayments.js`
Dodo Payments integration utilities.
- Initialize Dodo SDK
- Create checkout session
- Retrieve subscription status
- Cancel subscription

### `/src/lib/subscriptionHelpers.js`
Helper functions for subscription logic.
- Check if user has access to feature
- Get user's current tier
- Check feature usage limits
- Increment usage counters

### `/src/hooks/useSubscription.js`
React hook for accessing subscription data.
- Fetches user's subscription from Supabase
- Provides helper methods (hasAccess, canUseFeature, etc.)
- Auto-refreshes on changes

---

## 3. Files to Update

### `/src/App.jsx`
Add new route for subscription management page.
- Add `/subscription` route

### `/src/lib/supabase.js`
Add helper functions for subscription queries.
- `getUserSubscription(userId)`
- `updateSubscriptionStatus(userId, data)`
- `getFeatureUsage(userId, feature)`
- `incrementFeatureUsage(userId, feature)`

### `/src/pages/Library.jsx`
Add subscription badge and upgrade prompt.
- Show SubscriptionBadge in header
- Display upgrade prompt for free users
- Gate features based on tier (future: storage limits, book limits)

### `/src/components/Auth.jsx`
Check subscription status on authentication.
- Fetch subscription data after user logs in
- Store in React Query cache

### `/.env.example`
Add Dodo Payments environment variables.
- `VITE_DODO_PAYMENTS_PUBLIC_KEY`
- `VITE_DODO_PAYMENTS_ACCOUNT_ID`

---

## 4. Backend/API Requirements

### Supabase Edge Functions (Serverless)
Create new edge function for handling Dodo Payments webhooks.

**Function: `/functions/billing`**
- Receives webhook events from Dodo Payments
- Verifies webhook signature using Dodo's verification method
- Updates both subscriptions and payments tables in database
- Handles subscription events:
  - `subscription.created` - Create subscription record
  - `subscription.updated` - Update subscription status/metadata
  - `subscription.cancelled` - Mark subscription as cancelled
  - `subscription.trial_ending` - Notify user
  - `subscription.expired` - Update status to expired
- Handles payment events:
  - `payment.succeeded` - Create payment record, link to subscription
  - `payment.failed` - Create failed payment record, handle dunning
  - `payment.refunded` - Update payment status to refunded
- Captures comprehensive metadata:
  - Subscription started date
  - Subscription ended date (if cancelled)
  - Current period start
  - Current period end
  - All Dodo metadata in JSONB fields

**Why:** Dodo Payments sends webhook events when subscriptions and payments change. We need to sync this data to Supabase for accurate billing history and subscription status.

---

## 5. Dodo Payments Setup Required

### Account Setup
1. Sign up at app.dodopayments.com
2. Create two products in Dodo dashboard:
   - Pro Plan: $4.99/month recurring
   - Plus Plan: $9.99/month recurring
3. Get API keys (public and secret)
4. Configure webhook endpoint URL (Supabase Edge Function URL)

### Integration Method
Use **Overlay Checkout** approach:
- User clicks "Upgrade" button
- Redirect to Dodo Payments checkout URL
- User completes payment on Dodo's secure page
- Redirect back to ReadEz with success/cancel status
- Webhook updates subscription in background

---

## 6. User Flow

### Upgrade Flow
1. User clicks "Upgrade to Pro" on Landing or Library page
2. SubscriptionModal opens showing plan comparison
3. User selects Pro or Plus and clicks "Subscribe"
4. Create Dodo checkout session via API
5. Redirect user to Dodo checkout page
6. User enters payment details and confirms
7. Dodo processes payment and sends webhook
8. Webhook handler updates subscription status in Supabase
9. User redirected back to ReadEz
10. Subscription status refreshes and features unlock

### Cancel Flow
1. User goes to Subscription page
2. Clicks "Cancel Subscription"
3. Confirmation modal appears
4. On confirm, call Dodo API to cancel subscription
5. Subscription marked as `cancel_at_period_end = true`
6. User retains access until period end date
7. Webhook updates status to 'cancelled' when period ends

---

## 7. Feature Gating Examples

### In Application Code
Check subscription tier before allowing feature access:

**Example: AI Summary Feature**
- Check if user has Pro or Plus tier
- If Free tier, check usage count (max 3/month)
- If limit reached, show upgrade prompt
- Otherwise, allow feature and increment usage counter

**Example: Storage Limit**
- Check user's current storage usage
- Compare against tier limit (Free: 100MB, Pro: 5GB, Plus: 25GB)
- Block upload if limit reached
- Show upgrade prompt

---

## 8. Testing Checklist

### Dodo Payments Sandbox Mode
Use Dodo's test mode for development:
- Test successful payment
- Test failed payment
- Test subscription cancellation
- Test webhook delivery

### Application Testing
- Free user cannot access premium features
- Pro user can access all features except alpha
- Plus user can access all features including alpha
- Subscription status updates after payment
- Usage limits reset monthly
- Cancelled subscriptions retain access until period end

---

## 9. Security Considerations

### Environment Variables
Never expose secret keys in client-side code:
- Only use public keys in React components
- Store secret keys in Supabase Edge Function secrets

### Webhook Verification
Always verify webhook signatures:
- Prevents unauthorized subscription updates
- Use Dodo's webhook signature verification

### Row Level Security (RLS)
Enable RLS on subscription tables:
- Users can only read their own data
- Webhooks use service role to bypass RLS for writes

---

## 10. Rollout Strategy

### Phase 1: Database Setup
- Create subscription tables in Supabase
- Set up RLS policies
- Test with manual data insertion

### Phase 2: Dodo Integration
- Set up Dodo account and products
- Create webhook handler
- Test webhook events with Dodo sandbox

### Phase 3: UI Components
- Build SubscriptionModal component
- Add subscription badge to Library
- Create Subscription management page
- Test user flows

### Phase 4: Feature Gating
- Implement tier checking logic
- Add upgrade prompts throughout app
- Test feature access restrictions

### Phase 5: Launch
- Switch Dodo to production mode
- Enable subscription features for all users
- Monitor webhook delivery and subscription updates

---

## 11. Estimated Complexity

### Low Complexity
- Database schema creation
- Environment variable setup
- Subscription badge component

### Medium Complexity
- Dodo Payments integration (overlay checkout)
- Webhook handler implementation
- Subscription management page UI

### High Complexity
- Feature gating logic throughout app
- Usage tracking and enforcement
- Webhook error handling and retry logic
- Testing all edge cases (failed payments, cancellations, etc.)

---

## 12. Dependencies to Install

**NPM Packages:**
- None required for overlay checkout approach (just redirect to Dodo URL)
- If using Dodo SDK: `npm install @dodopayments/billing-sdk` (optional)

**Supabase:**
- No new dependencies (use existing Supabase client)

---

## Summary

This implementation involves:
- 2 new database tables
- 6 new files (components, pages, utilities, hooks)
- 4 files to update (routes, library, auth, env)
- 1 Supabase Edge Function (webhook handler)
- Dodo Payments account setup and integration

The core complexity is in the webhook handling and feature gating logic. The UI components are straightforward. Estimated development time: 2-3 weeks for full implementation and testing.
