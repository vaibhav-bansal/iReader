import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { track } from '@vercel/analytics'
import { trackEvent, getPostHog } from './lib/posthog'
import Library from './pages/Library'
import Auth from './components/Auth'

// Lazy load the Reader component (includes heavy PDF.js library)
const Reader = lazy(() => import('./pages/Reader'))

function App() {
  // Send test events once when app loads
  useEffect(() => {
    // Vercel Analytics test
    track('app_loaded', {
      test: true,
      timestamp: new Date().toISOString()
    })
    console.log('✅ Vercel Analytics test event sent: app_loaded')
    
    // PostHog test - only send once per session
    const posthogTestSent = sessionStorage.getItem('posthog_test_sent')
    if (!posthogTestSent) {
      const posthog = getPostHog()
      if (posthog) {
        // Send a simple test event
        trackEvent('app_loaded', {
          test: true,
        })
        console.log('✅ PostHog test event sent: app_loaded')
        sessionStorage.setItem('posthog_test_sent', 'true')
      } else {
        console.warn('⚠️ PostHog not initialized - test event not sent')
      }
    }
  }, [])

  return (
    <Router>
      <Auth>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-lg">Loading reader...</div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/reader/:bookId" element={<Reader />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Auth>
    </Router>
  )
}

export default App
