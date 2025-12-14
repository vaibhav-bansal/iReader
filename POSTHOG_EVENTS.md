# PostHog Analytics Events

This document lists all the events tracked by PostHog analytics in the iReader application.

## Setup

PostHog is configured with:
- **Session Replays**: Enabled for all sessions
- **User Identification**: Users are identified by their user ID and email
- **Autocapture**: Enabled for clicks, form submissions, and other interactions

## Environment Variables

Add these to your `.env` file:
```env
VITE_POSTHOG_KEY=your_posthog_project_api_key
VITE_POSTHOG_HOST=https://app.posthog.com  # Optional, defaults to PostHog Cloud
```

## Authentication Events

### `sign_in_attempted`
Triggered when user clicks "Sign in with Google"
- `method`: "google_oauth"

### `user_signed_in`
Triggered when user successfully signs in
- `method`: "google_oauth"

**Note**: User ID and email are automatically captured via `posthog.identify()` - no need to include in event properties.

### `sign_in_failed`
Triggered when sign in fails
- `method`: "google_oauth"
- `error`: Error message

### `sign_out_attempted`
Triggered when user clicks "Sign Out"

### `user_signed_out`
Triggered when user successfully signs out

### `sign_out_failed`
Triggered when sign out fails
- `error`: Error message

## Library Page Events

### `book_upload_started`
Triggered when user starts uploading a PDF
- `file_size`: Size of the file in bytes

**Note**: File name is excluded for privacy. File type is always PDF, so not included.

### `book_uploaded`
Triggered when book is successfully uploaded
- `book_id`: Unique book ID
- `file_size`: Size of the file in bytes
- `thumbnail_generated`: Boolean indicating if thumbnail was generated

**Note**: Book title can be looked up by `book_id` if needed. File name excluded for privacy.

### `book_upload_rejected`
Triggered when upload is rejected (e.g., not a PDF)
- `reason`: Reason for rejection

### `book_upload_failed`
Triggered when upload fails
- `file_size`: Size of the file (if available)
- `error`: Error message
- `reason`: Optional reason (e.g., "not_authenticated")

### `book_opened`
Triggered when user clicks on a book to open it
- `book_id`: Unique book ID
- `current_page`: Current page number (if any)
- `has_progress`: Boolean indicating if user has reading progress

**Note**: Book title can be looked up by `book_id`. Total pages tracked separately on PDF load.

### `book_delete_clicked`
Triggered when user clicks delete button on a book
- `book_id`: Unique book ID

### `book_delete_confirmed`
Triggered when user confirms book deletion
- `book_id`: Unique book ID

### `book_delete_cancelled`
Triggered when user cancels book deletion
- `book_id`: Unique book ID

### `book_deleted`
Triggered when book is successfully deleted
- `book_id`: Unique book ID
- `file_size`: Size of the deleted file

### `book_delete_failed`
Triggered when book deletion fails
- `book_id`: Unique book ID
- `error`: Error message

## Reader Page Events

### `pdf_loaded`
Triggered when PDF document successfully loads
- `book_id`: Unique book ID
- `total_pages`: Total number of pages
- `has_saved_progress`: Boolean indicating if user has saved progress

### `page_navigated`
Triggered when user navigates to a different page
- `book_id`: Unique book ID
- `page`: Page number user navigated to
- `method`: Navigation method (see methods below)

**Note**: Only the destination page is tracked. Previous page can be inferred from event sequence if needed.

**Navigation Methods:**
- `previous_button`: Clicked "Previous" button
- `next_button`: Clicked "Next" button
- `first_page`: Navigated to first page (Home key)
- `last_page`: Navigated to last page (End key)
- `keyboard_arrow_left`: Left arrow key
- `keyboard_arrow_right`: Right arrow key
- `keyboard_space`: Spacebar key
- `keyboard_home`: Home key
- `keyboard_end`: End key
- `swipe_left`: Swiped left on touch device
- `swipe_right`: Swiped right on touch device
- `swipe_up`: Swiped up on touch device
- `swipe_down`: Swiped down on touch device

### `page_jump_modal_opened`
Triggered when page jump modal is opened
- `book_id`: Unique book ID
- `method`: How modal was opened ("keyboard_g" or "page_info_click")

### `page_jump_modal_closed`
Triggered when page jump modal is closed
- `book_id`: Unique book ID
- `method`: How modal was closed ("backdrop_click" or "cancel_button")

### `page_jumped`
Triggered when user successfully jumps to a specific page
- `book_id`: Unique book ID
- `page`: Page number user jumped to
- `method`: "page_jump_modal"

### `page_jump_failed`
Triggered when page jump fails (invalid page number)
- `book_id`: Unique book ID
- `attempted_page`: Page number user tried to jump to (as string from input)
- `reason`: "invalid_page_number"

### `zoom_changed`
Triggered when user changes zoom level
- `book_id`: Unique book ID
- `zoom_level`: New zoom level
- `method`: "zoom_in_button" or "zoom_out_button"

### `reading_progress_saved`
Triggered when reading progress is saved to database
- `book_id`: Unique book ID
- `page`: Current page number
- `zoom_level`: Current zoom level
- `progress_percentage`: Percentage of book read (0-100)

### `reader_exited`
Triggered when user exits the reader (clicks "Back to Library")
- `book_id`: Unique book ID
- `current_page`: Current page number
- `zoom_level`: Current zoom level
- `progress_percentage`: Percentage of book read (0-100)

## User Identification

Users are automatically identified with:
- **User ID**: Supabase user ID
- **Email**: User's email address (from authentication)
- **Name**: User's full name (if available from OAuth)
- **Provider**: Authentication provider (e.g., "google")
- **Created At**: Account creation timestamp

## Session Replays

All user sessions are automatically recorded with session replays enabled. This allows you to:
- Watch how users interact with the application
- Debug issues by seeing exactly what users did
- Understand user behavior patterns

Session replays capture:
- Mouse movements and clicks
- Keyboard input (sensitive data can be masked)
- Page navigation
- Console errors
- Network requests

## Optimization Notes

The events have been optimized to reduce data volume while maintaining essential analytics:

### Removed Redundant Data:
- **`from_page`**: Removed from navigation events - only `page` (destination) is tracked
- **`book_title`**: Removed - can be looked up by `book_id` if needed
- **`total_pages`**: Removed from navigation events - tracked once on PDF load
- **`file_name`**: Removed for privacy - file names may contain sensitive information
- **`file_type`**: Removed - always "application/pdf"
- **`timestamp`**: Removed - PostHog adds this automatically
- **`user_id`/`email`**: Removed from events - captured via `posthog.identify()`

### Benefits:
- **Reduced data volume**: ~40-50% reduction in event payload size
- **Better privacy**: File names and titles excluded
- **Lower costs**: Less data = lower PostHog costs
- **Faster events**: Smaller payloads = faster transmission
- **Still complete**: All essential analytics data preserved

## General Notes

- Events are only sent if PostHog is properly initialized
- In development mode, events are logged to console if PostHog is not initialized
- User identification happens automatically on sign-in via `posthog.identify()`
- User is reset on sign-out via `posthog.reset()`
- Session replays capture all interactions automatically

