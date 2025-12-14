/**
 * PostHog Test Utility
 * 
 * This file contains test functions to verify PostHog integration.
 * You can call these functions from the browser console to test.
 * 
 * Usage:
 *   import { testPostHog } from './lib/posthogTest'
 *   testPostHog()
 * 
 * Or in browser console:
 *   window.testPostHog()
 */

import { trackEvent, identifyUser, resetUser, getPostHog } from './posthog'

/**
 * Test PostHog integration by sending dummy events
 */
export const testPostHog = async () => {
  console.log('🧪 Starting PostHog integration test...')
  
  const posthog = getPostHog()
  if (!posthog) {
    console.error('❌ PostHog is not initialized. Please check your VITE_POSTHOG_KEY environment variable.')
    return false
  }

  console.log('✅ PostHog is initialized')

  try {
    // Test 1: Identify a test user
    console.log('\n📝 Test 1: User Identification')
    identifyUser('test-user-123', 'test@example.com', {
      name: 'Test User',
      test: true,
    })
    console.log('✅ User identified')

    // Test 2: Authentication events
    console.log('\n🔐 Test 2: Authentication Events')
    trackEvent('sign_in_attempted', { method: 'google_oauth' })
    trackEvent('user_signed_in', { method: 'google_oauth' })
    console.log('✅ Authentication events sent')

    // Test 3: Library events
    console.log('\n📚 Test 3: Library Events')
    trackEvent('book_upload_started', { file_size: 1024000 })
    trackEvent('book_uploaded', {
      book_id: 'test-book-123',
      file_size: 1024000,
      thumbnail_generated: true,
    })
    trackEvent('book_opened', {
      book_id: 'test-book-123',
      current_page: 1,
      has_progress: false,
    })
    console.log('✅ Library events sent')

    // Test 4: Reader events
    console.log('\n📖 Test 4: Reader Events')
    trackEvent('pdf_loaded', {
      book_id: 'test-book-123',
      total_pages: 100,
      has_saved_progress: false,
    })
    trackEvent('page_navigated', {
      book_id: 'test-book-123',
      page: 5,
      method: 'next_button',
    })
    trackEvent('zoom_changed', {
      book_id: 'test-book-123',
      zoom_level: 1.5,
      method: 'zoom_in_button',
    })
    trackEvent('reading_progress_saved', {
      book_id: 'test-book-123',
      page: 5,
      zoom_level: 1.5,
      progress_percentage: 5,
    })
    console.log('✅ Reader events sent')

    // Test 5: Error events
    console.log('\n⚠️ Test 5: Error Events')
    trackEvent('book_upload_failed', {
      file_size: 1024000,
      error: 'Test error message',
    })
    trackEvent('sign_in_failed', {
      method: 'google_oauth',
      error: 'Test authentication error',
    })
    console.log('✅ Error events sent')

    // Test 6: Navigation methods
    console.log('\n🔄 Test 6: Different Navigation Methods')
    const methods = [
      'previous_button',
      'next_button',
      'keyboard_arrow_left',
      'keyboard_arrow_right',
      'keyboard_space',
      'swipe_left',
      'swipe_right',
    ]
    methods.forEach((method, index) => {
      trackEvent('page_navigated', {
        book_id: 'test-book-123',
        page: 10 + index,
        method: method,
      })
    })
    console.log('✅ Navigation method events sent')

    // Test 7: Delete flow
    console.log('\n🗑️ Test 7: Delete Flow')
    trackEvent('book_delete_clicked', { book_id: 'test-book-456' })
    trackEvent('book_delete_confirmed', { book_id: 'test-book-456' })
    trackEvent('book_deleted', {
      book_id: 'test-book-456',
      file_size: 2048000,
    })
    console.log('✅ Delete flow events sent')

    // Test 8: Page jump flow
    console.log('\n🔍 Test 8: Page Jump Flow')
    trackEvent('page_jump_modal_opened', {
      book_id: 'test-book-123',
      method: 'keyboard_g',
    })
    trackEvent('page_jumped', {
      book_id: 'test-book-123',
      page: 50,
      method: 'page_jump_modal',
    })
    trackEvent('page_jump_modal_closed', {
      book_id: 'test-book-123',
      method: 'backdrop_click',
    })
    console.log('✅ Page jump flow events sent')

    // Test 9: Reader exit
    console.log('\n🚪 Test 9: Reader Exit')
    trackEvent('reader_exited', {
      book_id: 'test-book-123',
      current_page: 25,
      zoom_level: 1.5,
      progress_percentage: 25,
    })
    console.log('✅ Reader exit event sent')

    // Test 10: Reset user
    console.log('\n🔄 Test 10: User Reset')
    resetUser()
    console.log('✅ User reset')

    console.log('\n✅ All tests completed! Check your PostHog dashboard to verify events were received.')
    console.log('📊 PostHog Dashboard: https://app.posthog.com/events')
    
    return true
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

/**
 * Test a single event type
 */
export const testSingleEvent = (eventName, properties = {}) => {
  console.log(`🧪 Testing event: ${eventName}`)
  trackEvent(eventName, properties)
  console.log(`✅ Event "${eventName}" sent with properties:`, properties)
}

/**
 * Check PostHog status
 */
export const checkPostHogStatus = () => {
  const posthog = getPostHog()
  if (!posthog) {
    console.error('❌ PostHog is not initialized')
    console.log('💡 Make sure VITE_POSTHOG_KEY is set in your .env file')
    return false
  }

  console.log('✅ PostHog Status:')
  console.log('  - Initialized: Yes')
  console.log('  - Session Recording:', posthog.sessionRecordingStarted() ? 'Enabled' : 'Disabled')
  console.log('  - Distinct ID:', posthog.get_distinct_id())
  
  return true
}

// Make functions available globally for browser console testing
// Use both immediate execution and a delayed setup to ensure it works
const setupGlobalFunctions = () => {
  if (typeof window !== 'undefined') {
    window.testPostHog = testPostHog
    window.testSingleEvent = testSingleEvent
    window.checkPostHogStatus = checkPostHogStatus
    
    // Only log in development mode to avoid console spam in production
    if (import.meta.env.DEV) {
      console.log('%c🧪 PostHog Test Functions Available', 'color: #00ff00; font-weight: bold;')
      console.log('  - window.testPostHog() - Run all tests')
      console.log('  - window.testSingleEvent(eventName, properties) - Test single event')
      console.log('  - window.checkPostHogStatus() - Check PostHog status')
      console.log('\n💡 Example: window.testPostHog()')
    }
  }
}

// Execute immediately
setupGlobalFunctions()

// Also set up on DOM ready (in case module loads before DOM)
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGlobalFunctions)
  } else {
    // DOM already loaded, but set up anyway
    setTimeout(setupGlobalFunctions, 0)
  }
}

