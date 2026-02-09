# Deploy Dodo Payments Edge Functions

## Overview

Two edge functions handle payments:
- **checkout-session-manager**: Creates checkout sessions when user clicks "Upgrade" (Frontend → Backend → Dodo)
- **webhook-manager**: Processes webhook events after payment completes (Dodo → Backend → Database)

## 1. Set Environment Variables

Run these commands to set your Dodo Payments API keys in Supabase:

```bash
# Webhook secret (used by webhook-manager)
npx supabase secrets set PAYMENT_WEBHOOK_SECRET=your_webhook_secret_here

# For TEST mode (used by checkout-session-manager)
npx supabase secrets set DODO_TEST_API_KEY=your_test_api_key_here
npx supabase secrets set DODO_TEST_PRO_PRODUCT_ID=your_test_pro_product_id
npx supabase secrets set DODO_TEST_PLUS_PRODUCT_ID=your_test_plus_product_id

# For LIVE mode (when ready for production)
npx supabase secrets set DODO_API_KEY=your_live_api_key_here
npx supabase secrets set DODO_PRO_PRODUCT_ID=your_live_pro_product_id
npx supabase secrets set DODO_PLUS_PRODUCT_ID=your_live_plus_product_id

# Set environment mode (TEST or LIVE)
npx supabase secrets set VITE_ENV=TEST
```

## 2. Deploy the Edge Functions

```bash
# Deploy both functions
npx supabase functions deploy checkout-session-manager
npx supabase functions deploy webhook-manager

# Verify deployment
npx supabase functions list
```

## 3. Configure Webhook in Dodo Payments Dashboard

After deploying `webhook-manager`, you'll get a URL like:
```
https://your-project-ref.supabase.co/functions/v1/webhook-manager
```

Add this URL to your Dodo Payments webhook settings:
1. Go to https://app.dodopayments.com/developer/webhooks
2. Add a new webhook endpoint with the URL above
3. Select the events you want to receive (subscription.*, payment.*)

## 4. Test the Checkout Flow

1. Start your local dev server: `npm run dev`
2. Navigate to your app and try to upgrade to Pro
3. Check the browser console and Supabase function logs

## 5. View Function Logs

To see logs from your edge function:

```bash
npx supabase functions logs checkout-session-manager
```

Or view in the Supabase Dashboard:
- Go to https://supabase.com/dashboard
- Select your project
- Go to Edge Functions → checkout-session-manager → Logs

## Notes

- The edge function securely stores your API keys on the server
- No API keys are exposed in the frontend code
- CORS is properly configured
- User authentication is verified before creating checkout sessions
