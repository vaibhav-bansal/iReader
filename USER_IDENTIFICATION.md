# User Identification & Device Tracking

This document details how iReader identifies and tracks users for analytics and debugging purposes, while maintaining privacy and avoiding PII (Personally Identifiable Information).

## Overview

Since iReader operates in **guest mode** (no user accounts), we use a combination of:
1. **Unique User IDs** (persistent across sessions)
2. **Session IDs** (per browser session)
3. **Device Fingerprinting** (aggregate, non-PII)
4. **Browser/OS Information** (automatic via PostHog)
5. **Location/Locale Data** (timezone, language - aggregate only)

## Identification Methods

### 1. Unique User ID
- **Storage**: localStorage (`ireader-user-id`)
- **Format**: `user_{timestamp}_{random}`
- **Persistence**: Survives browser restarts, cleared only if user clears browser data
- **Purpose**: Long-term user tracking across sessions
- **Privacy**: No PII, just a random identifier

### 2. Session ID
- **Storage**: sessionStorage (`ireader-session-id`)
- **Format**: `session_{timestamp}_{random}`
- **Persistence**: Resets on each new browser session
- **Purpose**: Session-level tracking and debugging
- **Privacy**: No PII, just a random identifier

### 3. Device Fingerprinting
- **Method**: Canvas-based fingerprinting (first 50 characters of canvas hash)
- **Purpose**: Aggregate device identification for debugging
- **Privacy**: Non-PII, aggregate only
- **Use Case**: Identify unique devices experiencing issues

### 4. PostHog Automatic Properties
PostHog automatically captures these on every event:
- `$os`: Operating system
- `$browser`: Browser name and version
- `$device_type`: Device category
- `$screen_width` / `$screen_height`: Screen dimensions
- `$viewport_width` / `$viewport_height`: Viewport dimensions
- `$current_url`: Current page URL
- `$referrer`: Referrer URL

### 5. Custom Device Properties
We enhance PostHog with additional properties:

#### Screen & Display
- Screen dimensions (width, height, available space)
- Color depth
- Viewport dimensions

#### Location & Locale (Aggregate)
- **Timezone**: IANA timezone (e.g., "America/New_York")
- **Language**: Browser language (e.g., "en-US")
- **Languages**: All browser languages

#### Platform & Hardware
- Platform identifier
- CPU cores (if available)
- Device memory (if available)

#### Network & Connection (Comprehensive)
- **Connection Type**: Effective type ("4g", "3g", "2g", "slow-2g")
- **Connection Speed**: 
  - Downlink speed in Mbps
  - Maximum theoretical downlink
  - Round-trip time (RTT) in milliseconds
- **Speed Category**: Classified as "very_fast", "fast", "medium", "slow", or "very_slow"
- **Connection Medium**: WiFi vs Mobile Data detection
  - Direct detection: "wifi_or_ethernet", "mobile_data" (when browser supports it)
  - Inferred: "likely_wifi", "likely_mobile_data" (based on speed/characteristics)
  - Unknown when detection not possible
- **Data Saver Mode**: Whether data saver is enabled (indicates mobile data usage)
- **Connection Type Detailed**: Direct type when available ("wifi", "cellular", "ethernet", etc.)
- **Connection Monitoring**: Tracks connection changes during session

## User Properties Stored in PostHog

When a user is identified, these properties are stored in their PostHog person profile:

```javascript
{
  // Identifiers
  session_id: "session_...",
  first_seen: "2025-01-15T10:30:00Z",
  last_seen: "2025-01-15T12:45:00Z",
  
  // Device
  device_type: "desktop",
  device_category: "desktop",
  screen_width: 1920,
  screen_height: 1080,
  viewport_width: 1920,
  viewport_height: 937,
  screen_color_depth: 24,
  
  // Location (Aggregate)
  timezone: "America/New_York",
  timezone_offset: 300,
  language: "en-US",
  languages: "en-US,en",
  
  // Platform
  platform: "Win32",
  hardware_concurrency: 8,
  device_memory: 8,
  
  // Browser
  cookie_enabled: true,
  do_not_track: null,
  
  // Network & Connection (Comprehensive)
  connection_type: "4g",
  connection_downlink: 10, // Mbps
  connection_downlink_max: 100, // Max theoretical Mbps
  connection_rtt: 50, // Round-trip time in ms
  connection_save_data: false,
  connection_speed_category: "fast", // "very_fast", "fast", "medium", "slow", "very_slow"
  connection_medium: "likely_wifi", // "wifi_or_ethernet", "mobile_data", "likely_wifi", "likely_mobile_data", "unknown"
  connection_type_detailed: "wifi", // "wifi", "cellular", "ethernet", etc. (when available)
  
  // App
  app_version: "0.1.0",
  is_guest: true,
  
  // Fingerprint (Aggregate)
  device_fingerprint_hash: "data:image/png;base64,iVBORw0KGgoAAAANS..."
}
```

## Use Cases

### 1. Debugging Issues
**Problem**: "Users on mobile devices can't upload books"

**Solution**: Filter events by:
- `device_type = "mobile"`
- `$os = "iOS"` or `$os = "Android"`
- `$browser = "Safari"` or `$browser = "Chrome"`

**Query**: Find all `book_uploaded` events where `device_type = "mobile"` and check for errors.

### 2. Performance Analysis
**Problem**: "App is slow on certain devices"

**Solution**: Analyze by:
- `connection_speed_category`: Identify slow connections ("slow", "very_slow")
- `connection_downlink`: Check actual speed in Mbps
- `connection_rtt`: High RTT indicates latency issues
- `connection_medium`: Compare WiFi vs Mobile Data performance
- `device_memory`: Check low-memory devices
- `hardware_concurrency`: Check single-core devices
- `screen_width` / `screen_height`: Check specific resolutions

**Example Query**: Find users with slow connections
```
Event: book_uploaded
Filter: connection_speed_category = "slow" OR connection_speed_category = "very_slow"
```

### 3. Feature Adoption
**Problem**: "Which device types use dark mode most?"

**Solution**: Group `theme_changed` events by:
- `device_type`
- `$os`
- `timezone` (for time-of-day analysis)

### 4. Error Correlation
**Problem**: "JavaScript errors only on specific browsers"

**Solution**: PostHog automatically correlates errors with:
- `$browser` and `$browser_version`
- `$os`
- `device_type`
- All custom properties

### 5. User Segmentation
**Problem**: "How do mobile users differ from desktop users?"

**Solution**: Create segments based on:
- `device_type`
- `screen_width` ranges
- `connection_type`
- `timezone` (for geographic patterns)

## Privacy Considerations

### ✅ What We Collect (Non-PII)
- Random user IDs (not linked to identity)
- Device characteristics (screen size, OS, browser)
- Aggregate location (timezone, language)
- Network characteristics (connection speed, type, WiFi/mobile detection)
- Connection speed and quality metrics
- Device fingerprint hash (aggregate only)
- Geographic location (country/city via PostHog IP geolocation - aggregate only)

### ISP Information
- **Direct ISP Detection**: Not available from browser APIs (requires external service)
- **PostHog IP Geolocation**: Automatically captures country and city via IP (aggregate only)
- **Geographic Analysis**: Can analyze usage patterns by country/region
- **Privacy**: IP-based geolocation is aggregate and doesn't identify individuals

### ❌ What We DON'T Collect
- Email addresses
- Names
- IP addresses (PostHog may capture, but we don't use them)
- Exact geographic location (only timezone)
- Personal information of any kind

### Privacy Features
1. **Session Recording**: All inputs and text masked
2. **DNT Support**: Respects Do Not Track header
3. **Local Storage**: User ID stored locally, not transmitted as PII
4. **Opt-out**: Users can disable via browser settings
5. **Aggregate Only**: All data used for aggregate analysis

## PostHog Person Profiles

Each user gets a PostHog person profile with:
- **Distinct ID**: The unique user ID
- **Properties**: All device/browser properties listed above
- **Events**: All events associated with that user
- **Sessions**: All sessions recorded
- **Timeline**: Complete activity timeline

This allows you to:
- See a user's complete journey
- Debug issues for specific users
- Understand user behavior patterns
- Identify problematic device/browser combinations

## Example Queries

### Find all mobile users who uploaded books
```
Event: book_uploaded
Filter: device_type = "mobile"
```

### Find users experiencing errors on Chrome
```
Event: $exception
Filter: $browser = "Chrome"
```

### Find users in specific timezone
```
Any Event
Filter: timezone = "America/New_York"
```

### Find users with slow connections
```
Any Event
Filter: connection_speed_category = "slow" OR connection_speed_category = "very_slow"
```

### Find users on mobile data vs WiFi
```
Any Event
Filter: connection_medium = "mobile_data" OR connection_medium = "likely_mobile_data"
```

### Find users experiencing connection changes
```
Event: connection_changed
Group by: connection_medium
```

### Analyze connection speed distribution
```
Any Event
Group by: connection_speed_category
Show: Count of events
```

## Best Practices

1. **Use Device Type for Segmentation**: Always include `device_type` in analysis
2. **Combine Properties**: Use multiple properties together for better identification
3. **Respect Privacy**: Never use this data to identify individuals
4. **Aggregate Analysis**: Use for aggregate patterns, not individual tracking
5. **Error Debugging**: Use device properties to correlate errors with device characteristics

## Summary

We track comprehensive device and browser information to:
- ✅ Identify users experiencing issues
- ✅ Debug problems by device/browser/OS
- ✅ Understand usage patterns
- ✅ Improve performance
- ✅ Maintain privacy (no PII)

All identification is done through:
- Random IDs (not linked to identity)
- Device characteristics (aggregate)
- Browser/OS information (automatic)
- Location data (timezone only, aggregate)

This provides powerful debugging and analytics capabilities while maintaining user privacy in guest mode.

