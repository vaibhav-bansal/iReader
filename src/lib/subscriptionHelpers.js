// Subscription Helper Functions
// Utilities for checking subscription tiers, feature access, and usage limits

import { supabase } from './supabase'

// Subscription tiers
export const TIERS = {
  FREE: 'free',
  PRO: 'pro',
  PLUS: 'plus',
}

// Subscription status
export const STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  TRIALING: 'trialing',
}

// Feature limits by tier
export const FEATURE_LIMITS = {
  [TIERS.FREE]: {
    ai_summaries: 3, // 3 per month
    storage_mb: 100, // 100MB
    books: 10, // 10 books
    collections: 3,
    themes: 3,
  },
  [TIERS.PRO]: {
    ai_summaries: -1, // Unlimited
    storage_mb: 5120, // 5GB
    books: -1, // Unlimited
    collections: -1,
    themes: 15,
  },
  [TIERS.PLUS]: {
    ai_summaries: -1, // Unlimited
    storage_mb: 25600, // 25GB
    books: -1, // Unlimited
    collections: -1,
    themes: -1, // Unlimited + custom CSS
  },
}

/**
 * Get user's current subscription
 * @param {string} userId - User ID from Supabase auth
 * @returns {Promise<object|null>} Subscription object or null
 */
export async function getUserSubscription(userId) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', STATUS.ACTIVE)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No subscription found, return default free subscription
        return {
          user_id: userId,
          tier: TIERS.FREE,
          status: STATUS.ACTIVE,
        }
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return null
  }
}

/**
 * Check if user has access to a specific tier
 * @param {string} userTier - User's current tier
 * @param {string} requiredTier - Required tier for feature
 * @returns {boolean}
 */
export function hasAccessToTier(userTier, requiredTier) {
  const tierHierarchy = [TIERS.FREE, TIERS.PRO, TIERS.PLUS]
  const userLevel = tierHierarchy.indexOf(userTier)
  const requiredLevel = tierHierarchy.indexOf(requiredTier)

  return userLevel >= requiredLevel
}

/**
 * Get feature usage for a user
 * @param {string} userId - User ID
 * @param {string} feature - Feature name (e.g., 'ai_summaries')
 * @returns {Promise<object|null>} Usage object {usage_count, reset_at}
 */
export async function getFeatureUsage(userId, feature) {
  try {
    const { data, error } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('feature', feature)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No usage record found, return default
        return {
          usage_count: 0,
          reset_at: getNextMonthStart(),
        }
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching feature usage:', error)
    return null
  }
}

/**
 * Check if user can use a feature (based on tier and usage limits)
 * @param {string} userId - User ID
 * @param {string} feature - Feature name
 * @param {string} userTier - User's current tier
 * @returns {Promise<{canUse: boolean, reason: string|null, usageCount: number, limit: number}>}
 */
export async function canUseFeature(userId, feature, userTier) {
  // Get feature limit for user's tier
  const limit = FEATURE_LIMITS[userTier]?.[feature]

  // If unlimited (-1) or no limit defined, allow
  if (!limit || limit === -1) {
    return {
      canUse: true,
      reason: null,
      usageCount: 0,
      limit: -1,
    }
  }

  // Check usage
  const usage = await getFeatureUsage(userId, feature)

  if (!usage) {
    // Error fetching usage, allow by default (fail open)
    return {
      canUse: true,
      reason: null,
      usageCount: 0,
      limit,
    }
  }

  const canUse = usage.usage_count < limit

  return {
    canUse,
    reason: canUse ? null : `You've reached your ${feature} limit for this month`,
    usageCount: usage.usage_count,
    limit,
  }
}

/**
 * Increment feature usage counter
 * @param {string} userId - User ID
 * @param {string} feature - Feature name
 * @returns {Promise<boolean>} Success status
 */
export async function incrementFeatureUsage(userId, feature) {
  try {
    // Check if usage record exists
    const { data: existing } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('feature', feature)
      .single()

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('subscription_usage')
        .update({
          usage_count: existing.usage_count + 1,
        })
        .eq('user_id', userId)
        .eq('feature', feature)

      if (error) throw error
    } else {
      // Create new record
      const { error } = await supabase.from('subscription_usage').insert({
        user_id: userId,
        feature,
        usage_count: 1,
        reset_at: getNextMonthStart(),
      })

      if (error) throw error
    }

    return true
  } catch (error) {
    console.error('Error incrementing feature usage:', error)
    return false
  }
}

/**
 * Get the start of next month (for reset_at)
 * @returns {string} ISO timestamp
 */
function getNextMonthStart() {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return nextMonth.toISOString()
}

/**
 * Get user's payment history
 * @param {string} userId - User ID
 * @returns {Promise<array>} Array of payment objects
 */
export async function getPaymentHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching payment history:', error)
    return []
  }
}

/**
 * Format tier name for display
 * @param {string} tier - Tier name
 * @returns {string} Formatted tier name
 */
export function formatTierName(tier) {
  const tierNames = {
    [TIERS.FREE]: 'Free',
    [TIERS.PRO]: 'Pro',
    [TIERS.PLUS]: 'Plus',
  }
  return tierNames[tier] || tier
}

/**
 * Get tier color for badges
 * @param {string} tier - Tier name
 * @returns {string} Tailwind color class
 */
export function getTierColor(tier) {
  const colors = {
    [TIERS.FREE]: 'gray',
    [TIERS.PRO]: 'blue',
    [TIERS.PLUS]: 'purple',
  }
  return colors[tier] || 'gray'
}
