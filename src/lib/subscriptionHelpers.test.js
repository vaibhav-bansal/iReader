// Unit tests for subscription helper functions
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  FEATURE_LIMITS,
  hasAccessToTier,
  getTierColor,
  formatTierName,
} from './subscriptionHelpers'

describe('subscriptionHelpers', () => {
  describe('FEATURE_LIMITS', () => {
    it('should have correct limits for free tier', () => {
      expect(FEATURE_LIMITS.free).toEqual({
        ai_summaries: 3,
        storage_mb: 100,
        books: 10,
      })
    })

    it('should have unlimited limits for pro tier', () => {
      expect(FEATURE_LIMITS.pro).toEqual({
        ai_summaries: -1, // -1 means unlimited
        storage_mb: 5120, // 5GB
        books: -1,
      })
    })

    it('should have unlimited limits for plus tier', () => {
      expect(FEATURE_LIMITS.plus).toEqual({
        ai_summaries: -1,
        storage_mb: 25600, // 25GB
        books: -1,
      })
    })
  })

  describe('hasAccessToTier', () => {
    it('should allow free tier to access free features', () => {
      expect(hasAccessToTier('free', 'free')).toBe(true)
    })

    it('should not allow free tier to access pro features', () => {
      expect(hasAccessToTier('free', 'pro')).toBe(false)
    })

    it('should not allow free tier to access plus features', () => {
      expect(hasAccessToTier('free', 'plus')).toBe(false)
    })

    it('should allow pro tier to access free and pro features', () => {
      expect(hasAccessToTier('pro', 'free')).toBe(true)
      expect(hasAccessToTier('pro', 'pro')).toBe(true)
    })

    it('should not allow pro tier to access plus features', () => {
      expect(hasAccessToTier('pro', 'plus')).toBe(false)
    })

    it('should allow plus tier to access all features', () => {
      expect(hasAccessToTier('plus', 'free')).toBe(true)
      expect(hasAccessToTier('plus', 'pro')).toBe(true)
      expect(hasAccessToTier('plus', 'plus')).toBe(true)
    })

    it('should handle invalid tiers gracefully', () => {
      expect(hasAccessToTier('invalid', 'pro')).toBe(false)
      expect(hasAccessToTier('free', 'invalid')).toBe(false)
    })
  })

  describe('getTierColor', () => {
    it('should return gray for free tier', () => {
      expect(getTierColor('free')).toBe('gray')
    })

    it('should return blue for pro tier', () => {
      expect(getTierColor('pro')).toBe('blue')
    })

    it('should return purple for plus tier', () => {
      expect(getTierColor('plus')).toBe('purple')
    })

    it('should return gray for unknown tier', () => {
      expect(getTierColor('unknown')).toBe('gray')
    })
  })

  describe('formatTierName', () => {
    it('should capitalize tier names', () => {
      expect(formatTierName('free')).toBe('Free')
      expect(formatTierName('pro')).toBe('Pro')
      expect(formatTierName('plus')).toBe('Plus')
    })

    it('should handle already capitalized names', () => {
      expect(formatTierName('Free')).toBe('Free')
      expect(formatTierName('Pro')).toBe('Pro')
    })

    it('should handle empty string', () => {
      expect(formatTierName('')).toBe('')
    })
  })
})
