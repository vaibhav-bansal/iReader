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

// Only initialize PostHog if API key is provided
const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST

const AppWrapper = () => {
  if (posthogKey && posthogHost) {
    return (
      <PostHogProvider
        apiKey={posthogKey}
        options={{
          api_host: posthogHost,
          defaults: '2025-05-24',
          capture_exceptions: true,
          debug: import.meta.env.MODE === 'development',
          session_recording: {
            maskAllInputs: false,
            maskTextSelector: null,
            recordCrossOriginIframes: false,
          },
          autocapture: true,
          capture_pageview: true,
          capture_pageleave: true,
          loaded: (posthog) => {
            // PostHog automatically captures these properties
          },
        }}
      >
        <BrowserRouter>
          <AnalyticsInitializer />
          <App />
          <Analytics />
        </BrowserRouter>
      </PostHogProvider>
    )
  } else {
    // Run without PostHog if env vars not set
    console.log('PostHog not configured - running without analytics')
    return (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>,
)