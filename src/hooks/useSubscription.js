// useSubscription Hook
// React hook for accessing user's subscription data throughout the app

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  getUserSubscription,
  hasAccessToTier,
  canUseFeature as checkFeatureAccess,
  TIERS,
} from '../lib/subscriptionHelpers'

/**
 * Hook to get and manage user subscription
 * @param {string} userId - User ID from Supabase auth
 * @returns {object} Subscription data and helper methods
 */
export function useSubscription(userId) {
  // Fetch subscription data with React Query
  const {
    data: subscription,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['subscription', userId],
    queryFn: () => getUserSubscription(userId),
    enabled: !!userId, // Only fetch if userId exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })

  // Get user's current tier
  const tier = subscription?.tier || TIERS.FREE

  // Helper methods
  const hasAccess = (requiredTier) => {
    return hasAccessToTier(tier, requiredTier)
  }

  const canUseFeature = async (feature) => {
    if (!userId) return { canUse: false, reason: 'User not authenticated' }
    return await checkFeatureAccess(userId, feature, tier)
  }

  const isPro = tier === TIERS.PRO || tier === TIERS.PLUS
  const isPlus = tier === TIERS.PLUS
  const isFree = tier === TIERS.FREE

  const isActive = subscription?.status === 'active'
  const isCancelled = subscription?.cancel_at_period_end === true

  return {
    subscription,
    tier,
    isLoading,
    error,
    refetch,
    // Helper methods
    hasAccess,
    canUseFeature,
    isPro,
    isPlus,
    isFree,
    isActive,
    isCancelled,
  }
}

/**
 * Hook to listen to subscription changes in realtime
 * @param {string} userId - User ID
 * @param {function} onUpdate - Callback when subscription updates
 */
export function useSubscriptionRealtime(userId, onUpdate) {
  if (!userId) return

  // Subscribe to subscription changes
  const channel = supabase
    .channel(`subscription:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'subscriptions',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('Subscription changed:', payload)
        if (onUpdate) {
          onUpdate(payload.new)
        }
      },
    )
    .subscribe()

  // Cleanup function
  return () => {
    supabase.removeChannel(channel)
  }
}
