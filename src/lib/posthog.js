import posthog from 'posthog-js'

// Initialize PostHog
export const initPostHog = () => {
  const posthogKey = import.meta.env.VITE_POSTHOG_KEY
  const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com'

  if (!posthogKey) {
    console.warn('PostHog key not found. Analytics will be disabled.')
    return
  }

  posthog.init(posthogKey, {
    api_host: posthogHost,
    // Enable session replays
    session_recording: {
      recordCrossOriginIframes: true,
      maskAllInputs: false, // Set to true if you want to mask all inputs
      maskTextSelector: '[data-ph-mask]', // Only mask elements with this selector
    },
    // Capture pageviews automatically
    capture_pageview: true,
    // Capture pageleaves automatically
    capture_pageleave: true,
    // Enable autocapture for clicks, form submissions, etc.
    autocapture: true,
    // Load session recordings
    loaded: (posthog) => {
      if (import.meta.env.DEV) {
        console.log('PostHog loaded successfully')
      }
    },
  })
}

// Check if PostHog is initialized
const isPostHogInitialized = () => {
  return posthog && typeof posthog.capture === 'function'
}

// Identify user with email and other properties
export const identifyUser = async (userId, email, additionalProperties = {}) => {
  if (!isPostHogInitialized()) {
    if (import.meta.env.DEV) {
      console.warn('PostHog not initialized. Cannot identify user.')
    }
    return
  }

  posthog.identify(userId, {
    email,
    ...additionalProperties,
  })
}

// Reset user on sign out
export const resetUser = () => {
  if (!isPostHogInitialized()) {
    return
  }
  posthog.reset()
}

// Track custom event with properties
export const trackEvent = (eventName, properties = {}) => {
  if (!isPostHogInitialized()) {
    if (import.meta.env.DEV) {
      console.log('PostHog event (not sent):', eventName, properties)
    }
    return
  }

  // PostHog automatically adds timestamp, so we don't need to include it
  posthog.capture(eventName, properties)
}

// Get PostHog instance (for advanced usage)
export const getPostHog = () => {
  return isPostHogInitialized() ? posthog : null
}

