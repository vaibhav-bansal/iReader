# Subscription Testing Guide

Complete testing guide for ReadEz subscription functionality with Dodo Payments integration.

---

## Prerequisites

Before testing, ensure:
- [x] Database tables created (subscriptions, payments, subscription_usage)
- [x] Billing edge function deployed to Supabase
- [x] Environment variables configured (.env file)
- [x] Webhook URL added to Dodo Payments dashboard
- [x] Dodo Payments test mode enabled

---

## Environment Variables Checklist

Verify these are set in your `.env` file:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Dodo Payments
VITE_DODO_PUBLIC_KEY=pk_test_xxxxx
VITE_DODO_PRO_PRODUCT_ID=prod_xxxxx
VITE_DODO_PLUS_PRODUCT_ID=prod_xxxxx
```

---

## Automated Tests

### Run All Tests

```bash
npm test
```

### Run Tests with UI

```bash
npm run test:ui
```

### Run Specific Test Files

```bash
# Test subscription helpers
npm test subscriptionHelpers.test

# Test subscription modal
npm test SubscriptionModal.test
```

### Expected Test Results

All tests should pass:
- ✓ Subscription helpers (feature limits, tier access)
- ✓ Subscription modal rendering
- ✓ Subscription modal user interactions
- ✓ Checkout flow initiation
- ✓ Error handling

---

## Manual Testing: Pro Subscription Flow

### Test 1: Fresh User Sign-Up and Upgrade to Pro

**Objective:** Test complete flow from sign-up to Pro subscription

#### Steps:

1. **Clear Browser Data**
   - Open browser in incognito/private mode
   - Or clear cookies and localStorage for localhost

2. **Navigate to Landing Page**
   ```
   http://localhost:5173/
   ```
   - ✓ Verify landing page loads
   - ✓ Verify pricing section shows: Free ($0), Pro ($4.99), Plus ($9.99)

3. **Sign In with Google**
   - Click "Get Started with Google" button
   - Complete Google OAuth flow
   - ✓ Verify redirected to `/library` after sign-in

4. **Check Library Page**
   - ✓ Verify "My Library" header displays
   - ✓ Verify subscription badge shows "Free" tier (gray badge)
   - ✓ Verify "Upgrade to Pro" button is visible in header

5. **Open Subscription Modal**
   - Click "Upgrade to Pro" button
   - ✓ Verify modal opens with three pricing cards
   - ✓ Verify "Free" card shows "Current Plan" (disabled button)
   - ✓ Verify "Pro" card shows "Lock in $4.99/mo" button (enabled)
   - ✓ Verify "Plus" card shows "Lock in $9.99/mo" button (enabled)

6. **Initiate Pro Subscription**
   - Click "Lock in $4.99/mo" button
   - ✓ Verify button shows "Processing..." loading state
   - ✓ Verify redirected to Dodo Payments checkout page
   - ✓ Verify checkout page shows correct amount ($4.99)
   - ✓ Verify product name is correct

7. **Complete Payment (Test Mode)**
   - Use Dodo test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - Click "Pay" or "Subscribe"
   - ✓ Verify payment processes successfully

8. **Verify Success Redirect**
   - ✓ Verify redirected to `/subscription/success`
   - ✓ Verify success page shows:
     - Green checkmark icon
     - "Subscription Activated!" message
     - "Your subscription is now active" text
     - "Continue to Library" button

9. **Return to Library**
   - Click "Continue to Library" button
   - ✓ Verify redirected to `/library`
   - ✓ Verify subscription badge now shows "Pro" (blue badge)
   - ✓ Verify "Upgrade to Pro" button is NO LONGER visible

10. **Verify Database Records**
    - Open Supabase Dashboard → Table Editor
    - Check `subscriptions` table:
      - ✓ New row exists for your user_id
      - ✓ `tier` = 'pro'
      - ✓ `status` = 'active'
      - ✓ `dodo_subscription_id` is populated
      - ✓ `current_period_start` and `current_period_end` are set
    - Check `payments` table:
      - ✓ New row exists for the payment
      - ✓ `status` = 'succeeded'
      - ✓ `amount` = 4.99
      - ✓ `currency` = 'USD'
      - ✓ `dodo_payment_id` is populated

11. **Test Subscription Modal Again**
    - Click on the subscription badge or manually open modal
    - ✓ Verify "Pro" card shows "Current Plan" (disabled)
    - ✓ Verify "Free" card shows "Downgrade" option
    - ✓ Verify "Plus" card shows "Lock in $9.99/mo" (can still upgrade)

---

## Manual Testing: Plus Subscription Flow

Follow the same steps as Pro flow, but:
- In Step 6: Click "Lock in $9.99/mo" instead
- In Step 7: Verify amount is $9.99
- In Steps 9-10: Verify badge shows "Plus" (purple badge)
- In Step 10 (database): Verify `tier` = 'plus'

---

## Manual Testing: Cancellation Flow

### Test 2: Cancel Checkout

**Objective:** Test user canceling the checkout process

#### Steps:

1. Sign in and open subscription modal
2. Click "Lock in $4.99/mo"
3. On Dodo checkout page, click "Cancel" or browser back button
4. ✓ Verify redirected to `/subscription/cancel`
5. ✓ Verify cancel page shows:
   - Gray X icon
   - "Checkout Cancelled" message
   - "Try Again" button
   - "Back to Library" button
6. Click "Back to Library"
7. ✓ Verify returned to library
8. ✓ Verify subscription badge still shows "Free" (no upgrade occurred)

---

## Manual Testing: Landing Page Integration

### Test 3: Landing Page Pricing Buttons

**Objective:** Test subscription flow from landing page

#### Steps:

1. **Sign out** from current session
2. Navigate to landing page: `http://localhost:5173/`
3. Scroll to "Pricing Section"
4. Click "Lock in $4.99/mo" button on Pro card
5. ✓ Verify toast notification: "Please sign in first to upgrade"
6. ✓ Verify redirected to Google OAuth
7. Complete sign-in
8. ✓ Verify redirected to `/library` (not directly to checkout)
9. From library, click "Upgrade to Pro" to continue

---

## Edge Case Testing

### Test 4: Already Subscribed User

**Objective:** Verify users with active subscriptions see correct UI

#### Steps:

1. Sign in with account that has Pro subscription
2. Navigate to library
3. ✓ Verify badge shows "Pro"
4. ✓ Verify NO "Upgrade to Pro" button shown
5. Open subscription modal
6. ✓ Verify Pro card shows "Current Plan" (disabled)
7. ✓ Verify Plus card shows upgrade option
8. ✓ Verify Free card shows downgrade option

---

### Test 5: Network Errors

**Objective:** Test error handling

#### Steps:

1. Open browser DevTools → Network tab
2. Set network to "Offline"
3. Try to upgrade to Pro
4. ✓ Verify error toast: "Failed to initiate checkout"
5. ✓ Verify button returns to normal state (not stuck loading)
6. Re-enable network
7. Try again - should work

---

### Test 6: Webhook Verification

**Objective:** Verify webhook is receiving and processing events

#### Steps:

1. Complete a Pro subscription (Steps 1-8 from Test 1)
2. Open Dodo Payments Dashboard
3. Navigate to Webhooks section
4. ✓ Verify recent webhook delivery shows:
   - Event: `subscription.created`
   - Status: 200 OK
   - Response time: < 2s
5. Click on webhook event to view payload
6. ✓ Verify payload contains:
   - `user_id` in metadata
   - `tier` in metadata
   - Subscription details

**Alternative: Check Supabase Function Logs**

```bash
npx supabase functions logs billing
```

Look for log entries showing:
- Webhook received
- Signature verified
- Subscription created/updated

---

## Performance Testing

### Test 7: Modal Load Time

**Objective:** Verify modal opens quickly

#### Steps:

1. Open browser DevTools → Performance tab
2. Start recording
3. Click "Upgrade to Pro" button
4. Stop recording when modal fully loads
5. ✓ Verify modal opens in < 100ms
6. ✓ Verify no layout shifts

---

## Accessibility Testing

### Test 8: Keyboard Navigation

**Objective:** Verify modal is keyboard accessible

#### Steps:

1. Open subscription modal
2. Press `Tab` key repeatedly
3. ✓ Verify focus moves through:
   - Close button
   - Free tier button (if applicable)
   - Pro tier button
   - Plus tier button
4. Press `Escape` key
5. ✓ Verify modal closes

---

## Browser Compatibility Testing

### Test 9: Cross-Browser Testing

Test subscription flow in:
- ✓ Chrome (latest)
- ✓ Firefox (latest)
- ✓ Safari (latest, if on Mac)
- ✓ Edge (latest)

Each browser should:
- Display pricing correctly
- Handle OAuth redirect
- Complete checkout successfully
- Show correct subscription badge

---

## Mobile Testing (Optional)

### Test 10: Mobile Responsiveness

**Objective:** Verify subscription works on mobile

#### Steps:

1. Open DevTools → Toggle device toolbar
2. Select mobile device (e.g., iPhone 12)
3. Navigate through subscription flow
4. ✓ Verify modal is readable and usable
5. ✓ Verify pricing cards stack vertically
6. ✓ Verify buttons are tappable (not too small)

---

## Common Issues and Solutions

### Issue 1: Webhook Not Receiving Events

**Symptoms:**
- Payment succeeds but subscription badge doesn't update
- No records in `subscriptions` table

**Debug Steps:**
1. Check Dodo webhook URL is correct:
   - Should be: `https://[project-ref].supabase.co/functions/v1/billing`
2. Verify webhook secret is set:
   ```bash
   npx supabase secrets list
   ```
3. Check function logs:
   ```bash
   npx supabase functions logs billing
   ```

---

### Issue 2: Checkout Redirect Fails

**Symptoms:**
- Button shows "Processing..." but nothing happens
- Console error about CORS or network

**Debug Steps:**
1. Open browser console
2. Look for error messages
3. Verify environment variables are set:
   ```bash
   echo $VITE_DODO_PUBLIC_KEY
   echo $VITE_DODO_PRO_PRODUCT_ID
   ```
4. Check Dodo API keys are correct (test mode keys start with `pk_test_`)

---

### Issue 3: Badge Not Updating

**Symptoms:**
- Subscription created in database but badge still shows "Free"

**Debug Steps:**
1. Hard refresh page (Ctrl+Shift+R or Cmd+Shift+R)
2. Check React Query cache:
   - Open React DevTools
   - Check "Query" tab
   - Look for `subscription` query
3. Verify `useSubscription` hook is receiving correct data

---

## Test Checklist Summary

### Before Testing
- [ ] Database migration applied
- [ ] Billing function deployed
- [ ] Environment variables configured
- [ ] Webhook URL added to Dodo
- [ ] Dodo test mode enabled

### Core Flows
- [ ] Test 1: Fresh user upgrade to Pro (REQUIRED)
- [ ] Test 2: Cancel checkout
- [ ] Test 3: Landing page integration

### Edge Cases
- [ ] Test 4: Already subscribed user
- [ ] Test 5: Network errors
- [ ] Test 6: Webhook verification

### Quality Checks
- [ ] Test 7: Performance
- [ ] Test 8: Accessibility
- [ ] Test 9: Browser compatibility
- [ ] Test 10: Mobile responsiveness (optional)

---

## Success Criteria

All tests pass if:
1. ✓ User can upgrade from Free to Pro
2. ✓ Dodo checkout completes successfully
3. ✓ Webhook updates database correctly
4. ✓ Subscription badge reflects current tier
5. ✓ UI shows/hides appropriate buttons
6. ✓ Cancel flow works correctly
7. ✓ No console errors
8. ✓ Database records are accurate

---

## Next Steps After Testing

Once all tests pass:
1. Switch Dodo to production mode
2. Update environment variables with production keys
3. Test with real payment (small amount)
4. Monitor webhook logs for 24 hours
5. Announce subscription feature to users

---

## Support

If you encounter issues during testing:
1. Check Supabase function logs: `npx supabase functions logs billing`
2. Check Dodo webhook delivery in dashboard
3. Verify environment variables
4. Check browser console for errors
5. Review database records for inconsistencies

For critical issues, check:
- GitHub Issues: https://github.com/vaibhav-bansal/readez/issues
- Supabase Dashboard → Logs
- Dodo Payments Dashboard → Webhooks → Events
