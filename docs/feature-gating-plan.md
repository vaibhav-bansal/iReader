# Feature Gating Implementation Plan

This document outlines the feature gating logic to be implemented after the subscription system is in place.

**Status:** Deferred - Will implement together later

---

## What is Feature Gating?

Code that checks if a user has permission to use a feature based on their subscription tier, and either allows access or shows an upgrade prompt.

---

## Features to Gate

### 1. Enhanced Reading Features
**Free Tier:** Limited access
- Basic annotations only
- 3 preset themes
- 3 collections max

**Pro/Plus Tier:** Full access
- Advanced annotations
- Unlimited themes
- Unlimited collections

**Implementation Locations:**
- Annotation component
- Theme selector
- Collections manager

---

### 2. AI-Powered Features
**Free Tier:** Limited (3 summaries/month)
- Check usage before generating
- Show "X/3 used this month"
- Block at limit with upgrade prompt

**Pro/Plus Tier:** Unlimited
- No checks needed

**Implementation Locations:**
- AI summary button
- AI Q&A feature
- Translation feature

---

### 3. Marketplace
**Free Tier:** View only
- Can browse marketplace
- Cannot download/purchase

**Pro/Plus Tier:** Full access
- Browse, download, purchase

**Implementation Locations:**
- Marketplace page
- Download buttons
- Purchase flow

---

### 4. Analytics & Insights
**Free Tier:** Basic stats only
- Total books read
- Pages completed

**Pro Tier:** Full analytics
- Time tracking
- Reading goals
- Advanced dashboard

**Plus Tier:** Everything + data export
- All Pro features
- Export data functionality

**Implementation Locations:**
- Analytics dashboard
- Export buttons
- Goal setting UI

---

## Implementation Components

### Component 1: Subscription Context
Create React Context to provide subscription data throughout the app.

**File:** `/src/contexts/SubscriptionContext.jsx`

**Provides:**
- Current user's tier (free/pro/plus)
- Subscription status
- Helper functions: `hasAccess(feature)`, `canUseFeature(feature)`

---

### Component 2: Feature Gate Component
Reusable component that wraps features and checks access.

**File:** `/src/components/FeatureGate.jsx`

**Usage:**
```jsx
<FeatureGate feature="ai_summaries" requiredTier="pro">
  <AISummaryButton />
</FeatureGate>
```

**Behavior:**
- If user has access: Render children
- If user doesn't have access: Show upgrade prompt or lock icon

---

### Component 3: Upgrade Prompt Modal
Modal that appears when user tries to access locked feature.

**File:** `/src/components/UpgradePrompt.jsx`

**Shows:**
- Feature name
- Required tier
- Pricing
- Upgrade button

---

### Component 4: Usage Indicator
Shows usage for limited features.

**File:** `/src/components/UsageIndicator.jsx`

**Shows:**
- "2/3 AI summaries used this month"
- Progress bar
- Upgrade button when approaching limit

---

## Database Queries Needed

### Check User Tier
```sql
SELECT tier, status FROM subscriptions
WHERE user_id = ? AND status = 'active'
```

### Check Feature Usage
```sql
SELECT usage_count FROM subscription_usage
WHERE user_id = ? AND feature = ?
```

### Increment Usage
```sql
UPDATE subscription_usage
SET usage_count = usage_count + 1
WHERE user_id = ? AND feature = ?
```

---

## Where to Add Checks

### UI Level (Client-Side)
- Show/hide features based on tier
- Display usage indicators
- Show upgrade prompts
- Disable buttons for locked features

**Purpose:** Better UX, immediate feedback

**Security:** NOT secure - users can bypass client-side checks

---

### API Level (Server-Side)
- Verify tier before executing expensive operations
- Check usage limits before processing
- Return 403 Forbidden if access denied

**Purpose:** Security, prevent abuse

**Security:** Secure - cannot be bypassed

---

## Feature Gate Examples

### Example 1: AI Summary with Usage Limit
**Location:** AI Summary Button

**Logic:**
1. User clicks "Generate AI Summary"
2. Check user tier from SubscriptionContext
3. If Pro/Plus: Generate summary (no limit)
4. If Free:
   - Query usage from subscription_usage table
   - If usage < 3: Generate summary, increment counter
   - If usage >= 3: Show UpgradePrompt modal

---

### Example 2: Marketplace Download
**Location:** Marketplace Book Card

**Logic:**
1. User clicks "Download" button
2. Check user tier
3. If Free: Show "Upgrade to Pro to download books" modal
4. If Pro/Plus: Proceed with download

---

### Example 3: Storage Limit
**Location:** Book Upload

**Logic:**
1. User attempts to upload book
2. Calculate current storage usage
3. Check tier limit:
   - Free: 100MB
   - Pro: 5GB
   - Plus: 25GB
4. If (current usage + new file size) > limit:
   - Show "Storage full, upgrade for more space" modal
5. Else: Proceed with upload

---

## Implementation Order (When Ready)

1. Create SubscriptionContext
2. Add subscription data fetching on login
3. Create FeatureGate component
4. Create UpgradePrompt modal
5. Wrap first feature (e.g., AI summaries)
6. Test thoroughly
7. Roll out to other features incrementally

---

## Testing Checklist

- [ ] Free user cannot access Pro features
- [ ] Pro user can access Pro features
- [ ] Plus user can access all features
- [ ] Usage limits enforced correctly
- [ ] Usage counters reset monthly
- [ ] Upgrade prompts show correct pricing
- [ ] Client-side checks work
- [ ] Server-side checks work (cannot be bypassed)
- [ ] Graceful handling when subscription expires
- [ ] Cancelled subscriptions retain access until period end

---

## Notes

- Feature gating logic is deferred until after subscription system is built
- This document will be updated as we implement together
- Focus on subscription infrastructure first, then add gating logic
