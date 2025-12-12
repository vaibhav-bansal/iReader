import { usePostHog } from 'posthog-js/react'

// Analytics event names - using const object to simulate enum
export const ANALYTICS_EVENTS = {
  // App lifecycle
  APP_LOADED: 'app_loaded',
  SESSION_STARTED: 'session_started',
  
  // Library events
  BOOK_UPLOADED: 'book_uploaded',
  BOOK_OPENED: 'book_opened',
  BOOK_DELETED: 'book_deleted',
  LIBRARY_VIEWED: 'library_viewed',
  
  // Reading events
  READING_STARTED: 'reading_started',
  READING_PROGRESS_UPDATED: 'reading_progress_updated',
  PAGE_NAVIGATED: 'page_navigated',
  READING_COMPLETED: 'reading_completed',
  
  // Settings & preferences
  THEME_CHANGED: 'theme_changed',
  FONT_SIZE_CHANGED: 'font_size_changed',
  LINE_SPACING_CHANGED: 'line_spacing_changed',
  PAGE_WIDTH_CHANGED: 'page_width_changed',
  FONT_FAMILY_CHANGED: 'font_family_changed',
  SETTINGS_OPENED: 'settings_opened',
  
  // Annotations (for future implementation)
  HIGHLIGHT_ADDED: 'highlight_added',
  HIGHLIGHT_REMOVED: 'highlight_removed',
  NOTE_ADDED: 'note_added',
  NOTE_REMOVED: 'note_removed',
  BOOKMARK_ADDED: 'bookmark_added',
  BOOKMARK_REMOVED: 'bookmark_removed',
  
  // Dictionary
  DICTIONARY_LOOKUP: 'dictionary_lookup',
  
  // Navigation
  NAVIGATION_BACK_TO_LIBRARY: 'navigation_back_to_library',
}

// Custom properties - using const object to simulate enum
export const ANALYTICS_PROPERTIES = {
  BOOK_ID: 'book_id',
  BOOK_TITLE: 'book_title',
  BOOK_AUTHOR: 'book_author',
  BOOK_FORMAT: 'book_format',
  BOOK_SIZE: 'book_size',
  PROGRESS_PERCENTAGE: 'progress_percentage',
  READING_POSITION: 'reading_position',
  THEME: 'theme',
  FONT_SIZE: 'font_size',
  LINE_SPACING: 'line_spacing',
  PAGE_WIDTH: 'page_width',
  FONT_FAMILY: 'font_family',
  NAVIGATION_DIRECTION: 'navigation_direction',
  HIGHLIGHT_COLOR: 'highlight_color',
  NOTE_LENGTH: 'note_length',
  DICTIONARY_WORD: 'dictionary_word',
  SESSION_ID: 'session_id',
  USER_ID: 'user_id',
}

// Generate a device fingerprint (non-PII, aggregate identifier)
const getDeviceFingerprint = () => {
  if (typeof window === 'undefined') return null
  
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'top'
  ctx.font = '14px Arial'
  ctx.fillText('Device fingerprint', 2, 2)
  
  const fingerprint = {
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    language: navigator.language || navigator.userLanguage,
    languages: navigator.languages || [navigator.language],
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    deviceMemory: navigator.deviceMemory || null,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack || null,
    canvasHash: canvas.toDataURL().substring(0, 50), // First 50 chars for fingerprinting
  }
  
  return fingerprint
}

// Get device type classification
const getDeviceType = () => {
  if (typeof window === 'undefined') return 'unknown'
  
  const width = window.innerWidth
  const ua = navigator.userAgent.toLowerCase()
  
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet'
  }
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) {
    return 'mobile'
  }
  if (width >= 1024) {
    return 'desktop'
  }
  if (width >= 768) {
    return 'tablet'
  }
  return 'mobile'
}

// Get comprehensive connection information
const getConnectionInfo = () => {
  if (typeof navigator === 'undefined') return null
  
  // Try different browser implementations of Network Information API
  const conn = navigator.connection || 
               navigator.mozConnection || 
               navigator.webkitConnection ||
               (navigator.connection && navigator.connection.type !== undefined ? navigator.connection : null)
  
  if (!conn) return null

  const connectionInfo = {
    // Connection type classification
    effectiveType: conn.effectiveType || null, // "4g", "3g", "2g", "slow-2g"
    
    // Speed metrics
    downlink: conn.downlink || null, // Mbps
    downlinkMax: conn.downlinkMax || null, // Max theoretical downlink
    rtt: conn.rtt || null, // Round-trip time in milliseconds
    
    // Connection type (limited browser support)
    type: conn.type || null, // "wifi", "cellular", "ethernet", "bluetooth", "wimax", "other", "none", "unknown"
    
    // Data saver mode (indicates mobile data usage)
    saveData: conn.saveData || false,
    
    // Calculate speed category
    speedCategory: null,
    
    // Infer connection medium (WiFi vs Mobile Data)
    connectionMedium: null,
  }

  // Calculate speed category based on downlink
  if (connectionInfo.downlink !== null) {
    if (connectionInfo.downlink >= 10) {
      connectionInfo.speedCategory = 'very_fast' // 10+ Mbps
    } else if (connectionInfo.downlink >= 5) {
      connectionInfo.speedCategory = 'fast' // 5-10 Mbps
    } else if (connectionInfo.downlink >= 1) {
      connectionInfo.speedCategory = 'medium' // 1-5 Mbps
    } else if (connectionInfo.downlink >= 0.5) {
      connectionInfo.speedCategory = 'slow' // 0.5-1 Mbps
    } else {
      connectionInfo.speedCategory = 'very_slow' // < 0.5 Mbps
    }
  } else if (connectionInfo.effectiveType) {
    // Fallback to effectiveType if downlink not available
    switch (connectionInfo.effectiveType) {
      case '4g':
        connectionInfo.speedCategory = 'fast'
        break
      case '3g':
        connectionInfo.speedCategory = 'medium'
        break
      case '2g':
        connectionInfo.speedCategory = 'slow'
        break
      case 'slow-2g':
        connectionInfo.speedCategory = 'very_slow'
        break
    }
  }

  // Infer connection medium (WiFi vs Mobile Data)
  // This is an inference based on available data, not 100% accurate
  if (connectionInfo.type) {
    // Direct type detection (best case, limited browser support)
    if (connectionInfo.type === 'wifi' || connectionInfo.type === 'ethernet') {
      connectionInfo.connectionMedium = 'wifi_or_ethernet'
    } else if (connectionInfo.type === 'cellular') {
      connectionInfo.connectionMedium = 'mobile_data'
    } else {
      connectionInfo.connectionMedium = 'unknown'
    }
  } else {
    // Inference based on characteristics
    if (connectionInfo.saveData === true) {
      // Data saver mode is more common on mobile data
      connectionInfo.connectionMedium = 'likely_mobile_data'
    } else if (connectionInfo.effectiveType === '4g' && connectionInfo.downlink && connectionInfo.downlink > 20) {
      // Very high speeds are more likely WiFi
      connectionInfo.connectionMedium = 'likely_wifi'
    } else if (connectionInfo.effectiveType && ['2g', '3g', 'slow-2g'].includes(connectionInfo.efficientType)) {
      // 2G/3G are almost certainly mobile data
      connectionInfo.connectionMedium = 'likely_mobile_data'
    } else {
      connectionInfo.connectionMedium = 'unknown'
    }
  }

  return connectionInfo
}

// Generate or retrieve unique user ID
const getOrCreateUserId = () => {
  let userId = localStorage.getItem('ireader-user-id')
  if (!userId) {
    // Generate a unique ID
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('ireader-user-id', userId)
  }
  return userId
}

// Generate or retrieve session ID
const getOrCreateSessionId = () => {
  let sessionId = sessionStorage.getItem('ireader-session-id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('ireader-session-id', sessionId)
  }
  return sessionId
}

// Initialize analytics - call this on app load
export const initializeAnalytics = (posthog) => {
  if (!posthog) return

  const userId = getOrCreateUserId()
  const sessionId = getOrCreateSessionId()
  const deviceFingerprint = getDeviceFingerprint()
  const deviceType = getDeviceType()
  const connectionInfo = getConnectionInfo()
  const firstSeen = localStorage.getItem('ireader-first-seen') || new Date().toISOString()
  
  // Note: PostHog automatically captures IP-based geolocation:
  // $geoip_country_code, $geoip_city, $geoip_subdivision_1_code
  // No need for browser geolocation API

  // Store first seen timestamp if not already set
  if (!localStorage.getItem('ireader-first-seen')) {
    localStorage.setItem('ireader-first-seen', firstSeen)
  }

  // Prepare comprehensive user properties for identification
  const userProperties = {
    // User ID - explicitly set for PostHog
    user_id: userId, // Ensure user_id is in properties
    
    // Session info
    session_id: sessionId,
    first_seen: firstSeen,
    last_seen: new Date().toISOString(),
    
    // Device classification
    device_type: deviceType,
    device_category: deviceType, // Alias for PostHog compatibility
    
    // Screen & Display
    screen_width: deviceFingerprint?.screen?.width || null,
    screen_height: deviceFingerprint?.screen?.height || null,
    screen_avail_width: deviceFingerprint?.screen?.availWidth || null,
    screen_avail_height: deviceFingerprint?.screen?.availHeight || null,
    screen_color_depth: deviceFingerprint?.screen?.colorDepth || null,
    viewport_width: deviceFingerprint?.viewport?.width || null,
    viewport_height: deviceFingerprint?.viewport?.height || null,
    
    // Location & Locale (timezone and language from browser)
    // Note: Exact geographic location comes from PostHog's IP-based geolocation
    // PostHog automatically provides: $geoip_country_code, $geoip_city, $geoip_subdivision_1_code
    timezone: deviceFingerprint?.timezone || null,
    timezone_offset: deviceFingerprint?.timezoneOffset || null,
    language: deviceFingerprint?.language || null,
    languages: deviceFingerprint?.languages?.join(',') || null,
    
    // Platform & Hardware
    platform: deviceFingerprint?.platform || null,
    hardware_concurrency: deviceFingerprint?.hardwareConcurrency || null,
    device_memory: deviceFingerprint?.deviceMemory || null,
    
    // Browser capabilities
    cookie_enabled: deviceFingerprint?.cookieEnabled || false,
    do_not_track: deviceFingerprint?.doNotTrack || null,
    
    // Connection info (comprehensive)
    connection_type: connectionInfo?.effectiveType || null, // "4g", "3g", "2g", "slow-2g"
    connection_downlink: connectionInfo?.downlink || null, // Mbps
    connection_downlink_max: connectionInfo?.downlinkMax || null, // Max theoretical Mbps
    connection_rtt: connectionInfo?.rtt || null, // Round-trip time in ms
    connection_save_data: connectionInfo?.saveData || false,
    connection_speed_category: connectionInfo?.speedCategory || null, // "very_fast", "fast", "medium", "slow", "very_slow"
    connection_medium: connectionInfo?.connectionMedium || null, // "wifi_or_ethernet", "mobile_data", "likely_wifi", "likely_mobile_data", "unknown"
    connection_type_detailed: connectionInfo?.type || null, // "wifi", "cellular", "ethernet", etc. (limited browser support)
    
    // ISP/Geolocation (via PostHog automatic properties)
    // PostHog automatically captures: $geoip_country_code, $geoip_city, $geoip_subdivision_1_code
    // These are available on all events automatically
    
    // App-specific
    app_version: import.meta.env.VITE_APP_VERSION || '0.1.0',
    is_guest: true, // Always true for Stage 1
  }

  // Identify user with comprehensive properties and explicit user_id
  // PostHog automatically captures: $os, $browser, $device_type, $current_url, $referrer, etc.
  // user_id is explicitly passed as the distinct_id and in properties
  posthog.identify(userId, {
    ...userProperties,
    distinct_id: userId, // Explicit distinct ID
  })

  // Set person properties that persist across sessions
  posthog.register({
    ...userProperties,
    // Add device fingerprint hash for aggregate identification
    device_fingerprint_hash: deviceFingerprint?.canvasHash || null,
  })

  // Track session start with comprehensive device, connection, and location context
  posthog.capture(ANALYTICS_EVENTS.SESSION_STARTED, {
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId, // Explicit user_id in every event
    device_type: deviceType,
    device_category: deviceType,
    screen_width: deviceFingerprint?.screen?.width,
    screen_height: deviceFingerprint?.screen?.height,
    viewport_width: deviceFingerprint?.viewport?.width,
    viewport_height: deviceFingerprint?.viewport?.height,
    // Location & Locale (timezone and language)
    // Geographic location: PostHog provides $geoip_country_code, $geoip_city automatically
    timezone: deviceFingerprint?.timezone,
    timezone_offset: deviceFingerprint?.timezoneOffset,
    language: deviceFingerprint?.language,
    languages: deviceFingerprint?.languages?.join(','),
    platform: deviceFingerprint?.platform,
    // Connection details
    connection_type: connectionInfo?.effectiveType,
    connection_downlink: connectionInfo?.downlink,
    connection_rtt: connectionInfo?.rtt,
    connection_speed_category: connectionInfo?.speedCategory,
    connection_medium: connectionInfo?.connectionMedium,
    connection_type_detailed: connectionInfo?.type,
    connection_save_data: connectionInfo?.saveData,
    // PostHog automatically adds: $geoip_country_code, $geoip_city (for geographic/ISP analysis)
  })

  // Track app loaded with device, connection, and location context
  posthog.capture(ANALYTICS_EVENTS.APP_LOADED, {
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId, // Explicit user_id
    device_type: deviceType,
    screen_width: deviceFingerprint?.screen?.width,
    screen_height: deviceFingerprint?.screen?.height,
    viewport_width: deviceFingerprint?.viewport?.width,
    viewport_height: deviceFingerprint?.viewport?.height,
    timezone: deviceFingerprint?.timezone,
    language: deviceFingerprint?.language,
    connection_type: connectionInfo?.effectiveType,
    connection_downlink: connectionInfo?.downlink,
    connection_speed_category: connectionInfo?.speedCategory,
    connection_medium: connectionInfo?.connectionMedium,
  })

  // Monitor connection changes during session
  if (typeof window !== 'undefined' && navigator.connection) {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (conn && conn.addEventListener) {
      conn.addEventListener('change', () => {
        const updatedConnectionInfo = getConnectionInfo()
        if (updatedConnectionInfo) {
          // Track connection change
          posthog.capture('connection_changed', {
            [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
            [ANALYTICS_PROPERTIES.USER_ID]: userId,
            connection_type: updatedConnectionInfo.effectiveType,
            connection_downlink: updatedConnectionInfo.downlink,
            connection_speed_category: updatedConnectionInfo.speedCategory,
            connection_medium: updatedConnectionInfo.connectionMedium,
            connection_type_detailed: updatedConnectionInfo.type,
            connection_save_data: updatedConnectionInfo.saveData,
            connection_rtt: updatedConnectionInfo.rtt,
          })
        }
      })
    }
  }

  return { userId, sessionId, deviceType, deviceFingerprint, connectionInfo }
}

// Helper function to get PostHog instance
export const getPostHog = () => {
  // Try to get from window if available
  if (typeof window !== 'undefined' && window.posthog) {
    return window.posthog
  }
  return null
}

// Track event with properties
export const trackEvent = (eventName, properties = {}) => {
  const posthog = getPostHog()
  if (!posthog) {
    console.warn('PostHog not initialized')
    return
  }

  const userId = getOrCreateUserId()
  const sessionId = getOrCreateSessionId()
  const deviceType = getDeviceType()

  // Add session, user, and device context to all events
  const enrichedProperties = {
    ...properties,
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    device_type: deviceType,
  }

  posthog.capture(eventName, enrichedProperties)
}

// React hook for analytics
export const useAnalytics = () => {
  const posthog = usePostHog()

  const track = (eventName, properties = {}) => {
    if (!posthog) return

    const userId = getOrCreateUserId()
    const sessionId = getOrCreateSessionId()
    const deviceType = getDeviceType()

    // Enrich all events with session, user, and device context
    const enrichedProperties = {
      ...properties,
      [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
      [ANALYTICS_PROPERTIES.USER_ID]: userId,
      device_type: deviceType,
      // PostHog automatically adds: $os, $browser, $device_type, $screen_width, etc.
    }

    posthog.capture(eventName, enrichedProperties)
  }

  const identify = (userId, properties = {}) => {
    if (!posthog) return
    posthog.identify(userId, properties)
  }

  return { track, identify, posthog }
}

// Test function to trigger all analytics events at once
// This can be called from browser console: window.testAllAnalyticsEvents()
export const testAllAnalyticsEvents = () => {
  const posthog = getPostHog()
  if (!posthog) {
    console.warn('PostHog not initialized. Waiting for initialization...')
    setTimeout(() => {
      const retryPosthog = getPostHog()
      if (retryPosthog) {
        testAllAnalyticsEvents()
      } else {
        console.error('PostHog still not initialized after retry')
      }
    }, 1000)
    return
  }

  const userId = getOrCreateUserId()
  const sessionId = getOrCreateSessionId()
  const deviceType = getDeviceType()

  console.log('🧪 Testing all analytics events...')

  // App lifecycle events
  posthog.capture(ANALYTICS_EVENTS.APP_LOADED, {
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    device_type: deviceType,
    test_mode: true,
  })

  posthog.capture(ANALYTICS_EVENTS.SESSION_STARTED, {
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    device_type: deviceType,
    test_mode: true,
  })

  // Library events
  posthog.capture(ANALYTICS_EVENTS.LIBRARY_VIEWED, {
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    book_count: 3,
    test_mode: true,
  })

  posthog.capture(ANALYTICS_EVENTS.BOOK_UPLOADED, {
    [ANALYTICS_PROPERTIES.BOOK_ID]: 'test-book-1',
    [ANALYTICS_PROPERTIES.BOOK_TITLE]: 'Test Book Title',
    [ANALYTICS_PROPERTIES.BOOK_AUTHOR]: 'Test Author',
    [ANALYTICS_PROPERTIES.BOOK_FORMAT]: 'epub',
    [ANALYTICS_PROPERTIES.BOOK_SIZE]: 1024000,
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    upload_method: 'test',
    test_mode: true,
  })

  posthog.capture(ANALYTICS_EVENTS.BOOK_OPENED, {
    [ANALYTICS_PROPERTIES.BOOK_ID]: 'test-book-1',
    [ANALYTICS_PROPERTIES.BOOK_TITLE]: 'Test Book Title',
    [ANALYTICS_PROPERTIES.BOOK_AUTHOR]: 'Test Author',
    [ANALYTICS_PROPERTIES.BOOK_FORMAT]: 'epub',
    [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: 0,
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    source: 'test',
    test_mode: true,
  })

  posthog.capture(ANALYTICS_EVENTS.BOOK_DELETED, {
    [ANALYTICS_PROPERTIES.BOOK_ID]: 'test-book-2',
    [ANALYTICS_PROPERTIES.BOOK_TITLE]: 'Deleted Test Book',
    [ANALYTICS_PROPERTIES.BOOK_FORMAT]: 'pdf',
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    test_mode: true,
  })

  // Reading events
  posthog.capture(ANALYTICS_EVENTS.READING_STARTED, {
    [ANALYTICS_PROPERTIES.BOOK_ID]: 'test-book-1',
    [ANALYTICS_PROPERTIES.BOOK_TITLE]: 'Test Book Title',
    [ANALYTICS_PROPERTIES.BOOK_AUTHOR]: 'Test Author',
    [ANALYTICS_PROPERTIES.BOOK_FORMAT]: 'epub',
    [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: 0,
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    resumed: false,
    test_mode: true,
  })

  posthog.capture(ANALYTICS_EVENTS.READING_PROGRESS_UPDATED, {
    [ANALYTICS_PROPERTIES.BOOK_ID]: 'test-book-1',
    [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: 25.5,
    [ANALYTICS_PROPERTIES.READING_POSITION]: 'epubcfi(/6/4[chap01ref]!/4/2/2[page1]/1:0)',
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    test_mode: true,
  })

  posthog.capture(ANALYTICS_EVENTS.PAGE_NAVIGATED, {
    [ANALYTICS_PROPERTIES.BOOK_ID]: 'test-book-1',
    [ANALYTICS_PROPERTIES.NAVIGATION_DIRECTION]: 'next',
    [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: 30,
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    test_mode: true,
  })

  posthog.capture(ANALYTICS_EVENTS.PAGE_NAVIGATED, {
    [ANALYTICS_PROPERTIES.BOOK_ID]: 'test-book-1',
    [ANALYTICS_PROPERTIES.NAVIGATION_DIRECTION]: 'previous',
    [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: 28,
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    test_mode: true,
  })

  posthog.capture(ANALYTICS_EVENTS.READING_COMPLETED, {
    [ANALYTICS_PROPERTIES.BOOK_ID]: 'test-book-1',
    [ANALYTICS_PROPERTIES.BOOK_TITLE]: 'Test Book Title',
    [ANALYTICS_PROPERTIES.BOOK_AUTHOR]: 'Test Author',
    [ANALYTICS_PROPERTIES.BOOK_FORMAT]: 'epub',
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    test_mode: true,
  })

  // Settings & preferences events
  posthog.capture(ANALYTICS_EVENTS.THEME_CHANGED, {
    [ANALYTICS_PROPERTIES.BOOK_ID]: 'test-book-1',
    [ANALYTICS_PROPERTIES.THEME]: 'dark',
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    test_mode: true,
  })

  posthog.capture(ANALYTICS_EVENTS.FONT_SIZE_CHANGED, {
    [ANALYTICS_PROPERTIES.BOOK_ID]: 'test-book-1',
    [ANALYTICS_PROPERTIES.FONT_SIZE]: 18,
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    test_mode: true,
  })

  posthog.capture(ANALYTICS_EVENTS.LINE_SPACING_CHANGED, {
    [ANALYTICS_PROPERTIES.BOOK_ID]: 'test-book-1',
    [ANALYTICS_PROPERTIES.LINE_SPACING]: 1.5,
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    test_mode: true,
  })

  posthog.capture(ANALYTICS_EVENTS.PAGE_WIDTH_CHANGED, {
    [ANALYTICS_PROPERTIES.BOOK_ID]: 'test-book-1',
    [ANALYTICS_PROPERTIES.PAGE_WIDTH]: 'narrow',
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    test_mode: true,
  })

  posthog.capture(ANALYTICS_EVENTS.FONT_FAMILY_CHANGED, {
    [ANALYTICS_PROPERTIES.BOOK_ID]: 'test-book-1',
    [ANALYTICS_PROPERTIES.FONT_FAMILY]: 'serif',
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    test_mode: true,
  })

  posthog.capture(ANALYTICS_EVENTS.SETTINGS_OPENED, {
    [ANALYTICS_PROPERTIES.BOOK_ID]: 'test-book-1',
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    test_mode: true,
  })

  // Navigation events
  posthog.capture(ANALYTICS_EVENTS.NAVIGATION_BACK_TO_LIBRARY, {
    [ANALYTICS_PROPERTIES.BOOK_ID]: 'test-book-1',
    [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: 50,
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    test_mode: true,
  })

  // Dictionary event
  posthog.capture(ANALYTICS_EVENTS.DICTIONARY_LOOKUP, {
    [ANALYTICS_PROPERTIES.DICTIONARY_WORD]: 'serendipity',
    [ANALYTICS_PROPERTIES.BOOK_ID]: 'test-book-1',
    [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
    [ANALYTICS_PROPERTIES.USER_ID]: userId,
    test_mode: true,
  })

  // Force flush to send events immediately
  if (posthog.flush) {
    posthog.flush()
    console.log('✅ All events captured and flushed! Check PostHog dashboard.')
  } else {
    console.log('✅ All events captured! They will be sent in the next batch (within 30 seconds).')
    console.log('💡 Tip: Close the tab to force immediate send via beforeunload.')
  }

  return {
    userId,
    sessionId,
    deviceType,
    eventsSent: 17,
  }
}

// Expose test function globally for easy console access
if (typeof window !== 'undefined') {
  window.testAllAnalyticsEvents = testAllAnalyticsEvents
}
