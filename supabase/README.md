# Supabase Setup for ReadEz Subscriptions

This directory contains Supabase migrations and Edge Functions for the subscription system.

---

## Prerequisites

1. Supabase CLI: Use `npx supabase` or install via Scoop
2. Supabase project created at https://supabase.com
3. Linked to your project: `npx supabase link --project-ref your-project-ref`

---

## 1. Database Setup

### Run Migrations

```bash
# From project root
npx supabase db push
```

This will create the following tables:
- `subscriptions` - User subscription status and lifecycle
- `payments` - Payment transaction history
- `subscription_usage` - Feature usage tracking

### Verify Tables

Log into Supabase Dashboard → Table Editor → Check for the three tables.

---

## 2. Edge Functions Setup

### Deploy Webhook Manager

This function receives webhook events from Dodo Payments after transactions occur.

```bash
# Deploy the webhook-manager function
npx supabase functions deploy webhook-manager
```

### Deploy Checkout Session Creator

This function creates checkout sessions when users click "Upgrade".

```bash
# Deploy the checkout-session-manager function
npx supabase functions deploy checkout-session-manager
```

### Set Environment Variables

```bash
# Dodo Payments webhook secret (used by webhook-manager)
npx supabase secrets set PAYMENT_WEBHOOK_SECRET=your_webhook_secret_here

# Dodo Payments API keys (TEST mode - used by checkout-session-manager)
npx supabase secrets set DODO_TEST_API_KEY=your_test_api_key_here
npx supabase secrets set DODO_TEST_PRO_PRODUCT_ID=your_test_pro_product_id
npx supabase secrets set DODO_TEST_PLUS_PRODUCT_ID=your_test_plus_product_id

# Dodo Payments API keys (LIVE mode - for production)
npx supabase secrets set DODO_API_KEY=your_live_api_key_here
npx supabase secrets set DODO_PRO_PRODUCT_ID=your_live_pro_product_id
npx supabase secrets set DODO_PLUS_PRODUCT_ID=your_live_plus_product_id

# Environment mode (TEST or LIVE)
npx supabase secrets set VITE_ENV=TEST
```

### Get Webhook URL

After deploying `webhook-manager`, you'll get a URL like:
```
https://your-project-ref.supabase.co/functions/v1/webhook-manager
```

**Save this URL** - you'll need to add it to your Dodo Payments webhook settings in the dashboard.

---

## Next Steps

After Supabase setup is complete:
1. Update .env with Supabase and payment provider credentials
2. Implement React components for subscription UI
3. Integrate payment provider checkout flow
4. Test end-to-end subscription flow
