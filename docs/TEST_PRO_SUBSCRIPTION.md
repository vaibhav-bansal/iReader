# Pro Subscription Test - Step-by-Step Checklist

Use this checklist to test the Pro subscription flow. Check off each step as you complete it.

---

## Pre-Test Setup

- [ ] Development server is running (`npm run dev`)
- [ ] Browser console is open (F12)
- [ ] Using incognito/private browsing mode
- [ ] Dodo Payments dashboard is open in another tab

---

## Test Execution

### Step 1: Navigate to App
- [ ] Open browser to `http://localhost:5173/`
- [ ] Verify landing page loads successfully
- [ ] No console errors

**Expected:** Landing page with pricing section visible

---

### Step 2: Sign In
- [ ] Click "Get Started with Google" button
- [ ] Complete Google OAuth
- [ ] Redirected to `/library` page

**Expected:** Library page shows with "Free" badge and "Upgrade to Pro" button

**Screenshot recommendation:** Take screenshot of library page header

---

### Step 3: Open Subscription Modal
- [ ] Click "Upgrade to Pro" button in header
- [ ] Modal opens successfully
- [ ] Three pricing cards visible (Free, Pro, Plus)
- [ ] Free card shows "Current Plan" (disabled)
- [ ] Pro card shows "Lock in $4.99/mo" (enabled)

**Expected:** Modal displays all three tiers correctly

**Screenshot recommendation:** Take screenshot of open modal

---

### Step 4: Initiate Pro Subscription
- [ ] Click "Lock in $4.99/mo" button
- [ ] Button shows "Processing..." text
- [ ] Redirected to Dodo Payments checkout page

**Expected:** Dodo checkout page loads with $4.99/month subscription

**Verify on Dodo page:**
- [ ] Amount shows $4.99
- [ ] Frequency shows "per month"
- [ ] Product name is correct

---

### Step 5: Complete Payment (Test Mode)
Use test card details:
```
Card Number: 4242 4242 4242 4242
Expiry: 12/25 (any future date)
CVC: 123 (any 3 digits)
```

- [ ] Enter test card details
- [ ] Click "Pay" or "Subscribe" button
- [ ] Payment processes (loading indicator)
- [ ] Redirected back to ReadEz

**Expected:** Payment succeeds and redirects to `/subscription/success`

---

### Step 6: Verify Success Page
- [ ] URL is `/subscription/success`
- [ ] Green checkmark icon visible
- [ ] "Subscription Activated!" heading
- [ ] Success message displays
- [ ] "Continue to Library" button visible

**Expected:** Success page displays correctly

**Screenshot recommendation:** Take screenshot of success page

---

### Step 7: Return to Library
- [ ] Click "Continue to Library" button
- [ ] Redirected to `/library` page
- [ ] Subscription badge now shows "Pro" (blue)
- [ ] "Upgrade to Pro" button is GONE

**Expected:** Library shows Pro subscription status

**Screenshot recommendation:** Take screenshot showing blue "Pro" badge

---

### Step 8: Verify Database Records

Open Supabase Dashboard → Table Editor

**Check `subscriptions` table:**
- [ ] Find row with your `user_id`
- [ ] `tier` = 'pro'
- [ ] `status` = 'active'
- [ ] `dodo_subscription_id` is populated (not null)
- [ ] `dodo_customer_id` is populated (not null)
- [ ] `current_period_start` has date
- [ ] `current_period_end` has date
- [ ] `created_at` is recent (within last few minutes)

**Check `payments` table:**
- [ ] Find row with your `user_id`
- [ ] `status` = 'succeeded'
- [ ] `amount` = 4.99
- [ ] `currency` = 'USD'
- [ ] `dodo_payment_id` is populated (not null)
- [ ] `paid_at` has timestamp
- [ ] `metadata` contains JSON data

**Expected:** Both tables have correct records

**Screenshot recommendation:** Take screenshot of both table rows

---

### Step 9: Verify Webhook Received

**Option A: Dodo Dashboard**
- [ ] Open Dodo Payments Dashboard
- [ ] Navigate to Webhooks section
- [ ] Find recent webhook event
- [ ] Event type: `subscription.created` or `payment.succeeded`
- [ ] Status: 200 OK
- [ ] Response time: < 5 seconds

**Option B: Supabase Logs**
```bash
npx supabase functions logs billing --tail
```
- [ ] See log entry for webhook received
- [ ] See log entry for signature verified
- [ ] See log entry for subscription created

**Expected:** Webhook was successfully received and processed

---

### Step 10: Test Modal Again
- [ ] Open subscription modal again (click badge or use button)
- [ ] Pro card shows "Current Plan" (disabled)
- [ ] Free card shows "Downgrade" option
- [ ] Plus card shows "Lock in $9.99/mo" (enabled)

**Expected:** Modal reflects new Pro subscription status

---

## Test Results

### ✅ Test PASSED if:
- All checkboxes are checked
- No console errors occurred
- Database records are correct
- Badge shows "Pro" (blue)
- Webhook was received and processed

### ❌ Test FAILED if:
- Any step failed or showed errors
- Database records are missing or incorrect
- Badge still shows "Free"
- Webhook was not received

---

## Issue Logging

If test failed, note the following:

**What went wrong:**
```
[Describe the issue]
```

**At which step:**
```
[Step number and description]
```

**Error messages (from console):**
```
[Paste error messages]
```

**Screenshots:**
```
[Attach or reference screenshots]
```

**Database state:**
```
[Describe what you see in subscriptions and payments tables]
```

---

## Post-Test Cleanup (Optional)

If you want to test again with a fresh state:

1. **Delete test subscription from database:**
   ```sql
   DELETE FROM subscriptions WHERE user_id = 'your-user-id';
   DELETE FROM payments WHERE user_id = 'your-user-id';
   ```

2. **Cancel subscription in Dodo:**
   - Go to Dodo Dashboard → Subscriptions
   - Find test subscription
   - Click "Cancel"

3. **Clear browser cache:**
   - Clear localStorage
   - Clear cookies for localhost

4. **Sign out and sign in again**

---

## Success Confirmation

Once test passes, you have confirmed:
✓ Frontend subscription modal works
✓ Dodo Payments integration works
✓ Checkout flow completes successfully
✓ Webhook handler processes events
✓ Database records are created correctly
✓ UI updates reflect subscription status

**You are ready to move to production!** 🎉

---

## Next Steps

After successful test:
1. Test Plus subscription (same flow, use $9.99 button)
2. Test cancellation flow
3. Run automated tests: `npm test`
4. Review all screenshots for documentation
5. Switch to production mode when ready
