# iReader Analytics Events

This document lists all analytics events tracked in the iReader application using PostHog.

## User Identification & Session Tracking

### Core Identifiers

- **User ID**: Automatically generated unique identifier stored in localStorage (`ireader-user-id`)
  - Format: `user_{timestamp}_{random}`
  - Persists across browser sessions
  - Used for long-term user tracking

- **Session ID**: Automatically generated unique identifier stored in sessionStorage (`ireader-session-id`)
  - Format: `session_{timestamp}_{random}`
  - Resets on each new browser session
  - Used for session-level tracking

- **Session Recording**: Enabled with input masking for privacy
  - All inputs are masked automatically
  - Text content is masked for privacy
  - Cross-origin iframes are not recorded

- **User Identification**: Automatically called on app initialization with comprehensive device properties

### Device & Browser Identification (Automatic by PostHog)

PostHog automatically captures these properties on every event:

- `$os`: Operating system (e.g., "Windows", "macOS", "Linux", "iOS", "Android")
- `$browser`: Browser name (e.g., "Chrome", "Firefox", "Safari", "Edge")
- `$browser_version`: Browser version number
- `$device_type`: Device category ("Desktop", "Mobile", "Tablet")
- `$screen_width`: Screen width in pixels
- `$screen_height`: Screen height in pixels
- `$viewport_width`: Viewport width in pixels
- `$viewport_height`: Viewport height in pixels
- `$current_url`: Current page URL
- `$referrer`: Referrer URL (if available)
- `$lib`: Library name ("posthog-js")
- `$lib_version`: PostHog library version

### Custom Device & User Properties

We enhance PostHog's automatic capture with additional properties for better user identification:

#### Device Classification
- `device_type`: Custom classification ("desktop", "mobile", "tablet", "unknown")
- `device_category`: Alias for PostHog compatibility

#### Screen & Display Information
- `screen_width`: Screen width in pixels
- `screen_height`: Screen height in pixels
- `screen_avail_width`: Available screen width (excluding OS UI)
- `screen_avail_height`: Available screen height (excluding OS UI)
- `screen_color_depth`: Color depth in bits
- `viewport_width`: Current viewport width
- `viewport_height`: Current viewport height

#### Location & Locale (Aggregate, Non-PII)
- `timezone`: IANA timezone identifier (e.g., "America/New_York", "Europe/London")
- `timezone_offset`: Timezone offset in minutes from UTC
- `language`: Primary browser language (e.g., "en-US", "fr-FR")
- `languages`: Comma-separated list of all browser languages

#### Platform & Hardware
- `platform`: Operating system platform (e.g., "Win32", "MacIntel", "Linux x86_64")
- `hardware_concurrency`: Number of CPU cores (if available)
- `device_memory`: Device memory in GB (if available)

#### Browser Capabilities
- `cookie_enabled`: Whether cookies are enabled
- `do_not_track`: DNT header value ("1", "0", or null)

#### Network & Connection Information (Comprehensive)
- `connection_type`: Network connection type ("4g", "3g", "2g", "slow-2g")
- `connection_downlink`: Actual downlink speed in Mbps
- `connection_downlink_max`: Maximum theoretical downlink speed in Mbps
- `connection_rtt`: Round-trip time in milliseconds
- `connection_save_data`: Whether data saver mode is enabled
- `connection_speed_category`: Speed classification ("very_fast", "fast", "medium", "slow", "very_slow")
- `connection_medium`: WiFi vs Mobile Data detection
  - Direct: "wifi_or_ethernet", "mobile_data" (when browser supports)
  - Inferred: "likely_wifi", "likely_mobile_data" (based on characteristics)
  - "unknown" when detection not possible
- `connection_type_detailed`: Direct connection type ("wifi", "cellular", "ethernet", etc.) when available
- **Connection Monitoring**: Automatically tracks connection changes during session via `connection_changed` event

#### ISP & Geographic Information
- **PostHog Automatic Properties**: 
  - `$geoip_country_code`: Country code (e.g., "US", "GB")
  - `$geoip_city`: City name (e.g., "New York", "London")
  - `$geoip_subdivision_1_code`: State/Province code (e.g., "NY", "CA")
- **Note**: Direct ISP identification requires external service. PostHog provides IP-based geolocation (aggregate, non-PII) automatically on all events.

#### Device Fingerprinting (Non-PII, Aggregate Only)
- `device_fingerprint_hash`: Canvas-based device fingerprint hash (first 50 characters)
  - Used for aggregate device identification
  - Does not contain personal information
  - Helps identify unique devices for debugging purposes

#### App-Specific Properties
- `app_version`: Application version number
- `is_guest`: Always `true` for Stage 1 (guest mode)
- `first_seen`: Timestamp of first app visit
- `last_seen`: Timestamp of last app visit (updated on each session)

### Privacy Considerations

All properties collected are:
- **Non-PII**: No personally identifiable information (no email, name, IP address stored)
- **Aggregate**: Used for aggregate analysis and debugging
- **Opt-out Friendly**: Users can disable tracking via browser settings (DNT)
- **Masked**: Session recordings mask all inputs and text content
- **Local Storage**: User ID stored locally, not transmitted as PII

### Use Cases for Identification

These properties help identify users for:
1. **Debugging Issues**: Identify which device/OS/browser combinations have problems
2. **Performance Analysis**: Understand performance across different devices and connections
3. **Feature Adoption**: Track feature usage by device type, screen size, etc.
4. **User Segmentation**: Group users by device characteristics for analysis
5. **Error Tracking**: Correlate errors with specific device/browser combinations

## Analytics Events

### App Lifecycle Events

#### `app_loaded`
Triggered when the application first loads.

**Properties:**
- `session_id`: Current session identifier
- `user_id`: Unique user identifier
- `device_type`: Device classification ("desktop", "mobile", "tablet")
- `screen_width`: Screen width in pixels
- `screen_height`: Screen height in pixels
- `viewport_width`: Viewport width in pixels
- `viewport_height`: Viewport height in pixels
- Plus all PostHog automatic properties: `$os`, `$browser`, `$device_type`, etc.

#### `session_started`
Triggered when a new session begins.

**Properties:**
- `session_id`: Current session identifier
- `user_id`: Unique user identifier
- `device_type`: Device classification ("desktop", "mobile", "tablet")
- `device_category`: Device category (alias)
- `screen_width`: Screen width in pixels
- `screen_height`: Screen height in pixels
- `viewport_width`: Viewport width in pixels
- `viewport_height`: Viewport height in pixels
- `timezone`: IANA timezone identifier
- `language`: Primary browser language
- `platform`: Operating system platform
- `connection_type`: Network connection type (if available)
- Plus all PostHog automatic properties: `$os`, `$browser`, `$device_type`, etc.

---

### Library Events

#### `library_viewed`
Triggered when the library page is viewed.

**Properties:**
- `book_count`: Number of books in the library
- `session_id`: Current session identifier
- `user_id`: Unique user identifier
- `device_type`: Device classification
- Plus all PostHog automatic properties: `$os`, `$browser`, `$device_type`, etc.

#### `book_uploaded`
Triggered when a book is successfully uploaded.

**Properties:**
- `book_id`: Unique identifier of the uploaded book
- `book_title`: Title of the book
- `book_author`: Author of the book (or "Unknown")
- `book_format`: Format of the book ("epub" or "pdf")
- `book_size`: File size in bytes
- `upload_method`: Method used ("file_picker" or "drag_and_drop")
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

#### `book_opened`
Triggered when a book is opened from the library.

**Properties:**
- `book_id`: Unique identifier of the book
- `book_title`: Title of the book
- `book_author`: Author of the book
- `book_format`: Format of the book
- `progress_percentage`: Current reading progress (0-100)
- `source`: Source of the action ("library")
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

#### `book_deleted`
Triggered when a book is removed from the library.

**Properties:**
- `book_id`: Unique identifier of the deleted book
- `book_title`: Title of the deleted book
- `book_format`: Format of the deleted book
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

---

### Reading Events

#### `reading_started`
Triggered when a book is opened in the reader.

**Properties:**
- `book_id`: Unique identifier of the book
- `book_title`: Title of the book
- `book_author`: Author of the book
- `book_format`: Format of the book
- `progress_percentage`: Starting progress percentage
- `resumed`: Boolean indicating if reading was resumed from a previous session
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

#### `reading_progress_updated`
Triggered periodically (debounced to every 2 seconds) as the user reads.

**Properties:**
- `book_id`: Unique identifier of the book
- `progress_percentage`: Current reading progress (0-100)
- `reading_position`: Current position in the book (CFI for EPUB, page number for PDF)
- `page_number`: Page number (for PDFs only)
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

#### `page_navigated`
Triggered when the user navigates to the next or previous page.

**Properties:**
- `book_id`: Unique identifier of the book
- `navigation_direction`: Direction of navigation ("next" or "previous")
- `progress_percentage`: Current reading progress after navigation
- `page_number`: Page number (for PDFs only)
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

#### `reading_completed`
Triggered when reading progress reaches 100%.

**Properties:**
- `book_id`: Unique identifier of the book
- `book_title`: Title of the book
- `book_author`: Author of the book
- `book_format`: Format of the book
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

---

### Settings & Preferences Events

#### `settings_opened`
Triggered when the settings panel is opened.

**Properties:**
- `book_id`: Unique identifier of the current book
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

#### `theme_changed`
Triggered when the reading theme is changed.

**Properties:**
- `book_id`: Unique identifier of the current book
- `theme`: New theme value ("light", "dark", or "sepia")
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

#### `font_size_changed`
Triggered when the font size is changed.

**Properties:**
- `book_id`: Unique identifier of the current book
- `font_size`: New font size in pixels
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

#### `line_spacing_changed`
Triggered when the line spacing is changed.

**Properties:**
- `book_id`: Unique identifier of the current book
- `line_spacing`: New line spacing multiplier
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

#### `page_width_changed`
Triggered when the page width setting is changed.

**Properties:**
- `book_id`: Unique identifier of the current book
- `page_width`: New page width setting ("narrow", "medium", or "wide")
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

#### `font_family_changed`
Triggered when the font family is changed.

**Properties:**
- `book_id`: Unique identifier of the current book
- `font_family`: New font family ("serif", "sans-serif", or "monospace")
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

---

### Navigation Events

#### `navigation_back_to_library`
Triggered when the user navigates back to the library from the reader.

**Properties:**
- `book_id`: Unique identifier of the book being left
- `progress_percentage`: Reading progress when leaving
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

---

### Annotation Events (Future Implementation)

These events are defined in the analytics constants but not yet implemented in the codebase. They will be tracked when annotation features are added:

#### `highlight_added`
Triggered when a highlight is added to text.

**Properties:**
- `book_id`: Unique identifier of the book
- `highlight_color`: Color of the highlight
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

#### `highlight_removed`
Triggered when a highlight is removed.

**Properties:**
- `book_id`: Unique identifier of the book
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

#### `note_added`
Triggered when a note is added.

**Properties:**
- `book_id`: Unique identifier of the book
- `note_length`: Length of the note in characters
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

#### `note_removed`
Triggered when a note is removed.

**Properties:**
- `book_id`: Unique identifier of the book
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

#### `bookmark_added`
Triggered when a bookmark is added.

**Properties:**
- `book_id`: Unique identifier of the book
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

#### `bookmark_removed`
Triggered when a bookmark is removed.

**Properties:**
- `book_id`: Unique identifier of the book
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

#### `dictionary_lookup`
Triggered when a dictionary lookup is performed.

**Properties:**
- `book_id`: Unique identifier of the book
- `dictionary_word`: Word that was looked up
- `session_id`: Current session identifier
- `user_id`: Unique user identifier

---

## Implementation Notes

### Event Enrichment

- All events automatically include:
  - `session_id`: Current session identifier
  - `user_id`: Unique user identifier
  - `device_type`: Device classification
  - PostHog automatic properties: `$os`, `$browser`, `$device_type`, `$screen_width`, etc.

### Performance Optimizations

- Progress tracking is debounced to avoid excessive events (2-second intervals)
- Device fingerprinting is calculated once and cached
- Connection info is captured once per session

### Privacy & Security

- Session recording enabled with input masking for privacy
- All text content masked in recordings
- Cross-origin iframes not recorded
- No PII collected (no email, name, exact location)
- User can opt-out via browser DNT settings

### Initialization

- User identification happens automatically on app initialization
- Unique user IDs persist across sessions via localStorage
- Session IDs are reset on each new browser session
- Device properties captured once and stored in PostHog person properties
- All device properties are registered with PostHog for persistent user profiles

### PostHog Features Enabled

- **Autocapture**: Automatically captures clicks, form submissions, and pageviews
- **Pageview Tracking**: Automatic pageview capture
- **Pageleave Tracking**: Tracks when users leave pages
- **Exception Tracking**: Captures JavaScript errors
- **Session Recording**: Records user sessions with privacy masking
- **Feature Flags**: Ready for feature flag integration (if needed)

## Event Constants

All event names and property names are defined as constants in `src/utils/analytics.js`:
- `ANALYTICS_EVENTS`: Object containing all event name constants
- `ANALYTICS_PROPERTIES`: Object containing all property name constants

This ensures consistency and prevents typos in event tracking.

