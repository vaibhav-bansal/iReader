import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PostHogProvider, usePostHog } from 'posthog-js/react'
import { Analytics } from '@vercel/analytics/react'
import App from './App'
import { initializeAnalytics } from './utils/analytics'
import './index.css'

// Component to initialize analytics after PostHog is ready
function AnalyticsInitializer() {
  const posthog = usePostHog()

  useEffect(() => {
    if (posthog) {
      // Store posthog instance globally for utility functions
      window.posthog = posthog
      // Initialize analytics
      initializeAnalytics(posthog)
    }
  }, [posthog])

  return null
}

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration)
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error)
      })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={{
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
        defaults: '2025-05-24',
        capture_exceptions: true, // This enables capturing exceptions using Error Tracking, set to false if you don't want this
        debug: import.meta.env.MODE === 'development',
        session_recording: {
          maskAllInputs: false, // Raw recordings for debugging
          maskTextSelector: null, // No text masking
          recordCrossOriginIframes: false,
        },
        // Enable autocapture for additional context (clicks, form submissions, etc.)
        autocapture: true,
        // Capture pageviews automatically
        capture_pageview: true,
        // Capture pageleaves
        capture_pageleave: true,
        // Enable advanced features
        loaded: (posthog) => {
          // PostHog automatically captures these properties:
          // $os, $browser, $browser_version, $device_type, $screen_width, $screen_height
          // $viewport_width, $viewport_height, $current_url, $referrer, $lib, $lib_version
          // We enhance with additional custom properties in initializeAnalytics
        },
      }}
    >
      <BrowserRouter>
        <AnalyticsInitializer />
        <App />
        <Analytics />
      </BrowserRouter>
    </PostHogProvider>
  </React.StrictMode>,
)
