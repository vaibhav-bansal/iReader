<!-- 83406b9a-83a5-491d-8378-c79460ffac08 6f0a3252-62c1-43cc-a65b-ac079a0646b8 -->
# iReader Development Plan

## Executive Summary

iReader is a free, open-source, web-based e-book reader that delivers a Kindle-like experience entirely in the browser. The product is designed in two stages: **Stage 1** provides a fully-featured guest-only local reader, and **Stage 2** adds optional accounts, sync, and open catalog integrations while maintaining guest mode as first-class.

---

## Part 1: Kindle Feature Analysis & Mapping

### 1.1 Core Kindle Features Checklist

**Library Management**

- ✅ **Carry over**: Local library with metadata (title, author, cover), organization, search
- ✅ **Adapt**: Browser-based upload vs device sync; local storage vs cloud library
- ❌ **Skip**: Physical device storage management, device-specific file system access

**Reading UI & Typography**

- ✅ **Carry over**: Font size, line spacing, margins, themes (light/dark/sepia), page width
- ✅ **Adapt**: Responsive layouts for mobile/tablet/desktop; touch vs mouse interactions
- ❌ **Skip**: E-ink specific optimizations, physical page-turn buttons, battery optimization

**Themes & Night Reading**

- ✅ **Carry over**: Light, dark, sepia themes; warm/night-friendly color adjustments
- ✅ **Adapt**: Browser-based theme switching; CSS-based color schemes
- ❌ **Skip**: Hardware-level brightness controls, blue light filtering at OS level

**Highlights, Notes, Bookmarks**

- ✅ **Carry over**: Text selection highlighting, inline notes, location bookmarks
- ✅ **Adapt**: Browser text selection APIs; local storage for annotations
- ❌ **Skip**: Device-specific annotation gestures (e.g., long-press on e-ink)

**Dictionary & Word Lookup**

- ✅ **Carry over**: Word selection → definition popup, multiple languages
- ✅ **Adapt**: Free/open dictionary APIs (e.g., Wiktionary, Free Dictionary API)
- ❌ **Skip**: Proprietary dictionary databases, offline dictionary downloads

**In-Book Search**

- ✅ **Carry over**: Full-text search, match highlighting, navigation between results
- ✅ **Adapt**: Client-side search for loaded content; indexed search for large books
- ❌ **Skip**: Cloud-based search indexing

**Reading Progress & Stats**

- ✅ **Carry over**: Percentage complete, time remaining, reading streaks, daily stats
- ✅ **Adapt**: Browser-based time tracking; local storage for stats
- ❌ **Skip**: Device-specific battery usage tracking

**Navigation & Structure**

- ✅ **Carry over**: Table of contents, chapter navigation, "Go to" location/percentage
- ✅ **Adapt**: Browser-based navigation UI; EPUB/PDF structure parsing
- ❌ **Skip**: Physical button navigation

**Sync Across Devices**

- ✅ **Carry over**: Library sync, progress sync, annotation sync, preference sync
- ✅ **Adapt**: Optional cloud sync (Stage 2); guest mode remains local-only
- ❌ **Skip**: Automatic background sync (requires user-initiated sync in browser)

**Content Discovery**

- ✅ **Carry over**: Browse by genre, recommendations, popular books, collections
- ✅ **Adapt**: Open catalog integrations (Project Gutenberg, Standard Ebooks, Open Library)
- ❌ **Skip**: Paid marketplace, proprietary book recommendations

**Personal Documents**

- ✅ **Carry over**: Upload and read personal PDF/EPUB files
- ✅ **Adapt**: Browser file upload; local storage management
- ❌ **Skip**: Email-to-Kindle style document delivery

**Offline Reading**

- ✅ **Carry over**: Read uploaded books without internet connection
- ✅ **Adapt**: Service Worker for offline support; IndexedDB for book storage
- ❌ **Skip**: Pre-downloaded catalog books (Stage 1); requires upload first

**X-Ray & Knowledge Features**

- ⚠️ **Adapt carefully**: Character/term indexing using open NLP tools or manual extraction
- ❌ **Skip**: Proprietary X-Ray database; paid knowledge graph APIs

**Social Features**

- ✅ **Carry over**: Ratings, reviews, reading activity sharing
- ✅ **Adapt**: Open-source community features; no proprietary social networks
- ❌ **Skip**: Integration with paid social platforms

---

## Part 2: Stage 1 – Guest-First Local Reader

### 2.1 Core Capabilities

#### 2.1.1 Library & Uploads (Local-Only)

**User Experience:**

- Upload EPUB and PDF files via drag-and-drop or file picker
- Library view displays:
- Book cover (extracted from metadata or placeholder)
- Title and author (from metadata)
- Reading progress indicator (percentage)
- Last opened timestamp
- Format badge (EPUB/PDF)
- Actions: Open book, Remove from library, View book details
- Library persists across browser sessions using IndexedDB or localStorage
- No sign-in required; data stored locally on device

**Technical Considerations:**

- File parsing: EPUB.js or similar for EPUB; PDF.js for PDF
- Metadata extraction: EPUB metadata parsing; PDF metadata extraction
- Storage: IndexedDB for book files and metadata; localStorage for preferences
- File size limits: Browser-dependent (typically 50-100MB per file)

#### 2.1.2 Responsive Reading Experience

**User Experience:**

- Single Reader view that adapts to:
- **Mobile phones** (portrait/landscape): Single column, touch-optimized controls
- **Tablets**: Optimized margins, larger touch targets
- **Desktops**: Multi-column option, keyboard shortcuts, mouse interactions
- Reading actions:
- Next/Previous page (tap/click/swipe)
- Scroll mode (continuous scrolling)
- Table of contents navigation (when available)
- "Back to library" button
- Progress indicator:
- Top or bottom bar showing percentage and current location
- Minimizable or auto-hide in distraction-free mode
- Responsive typography: Font scales appropriately for viewport size

**Technical Considerations:**

- CSS Grid/Flexbox for responsive layouts
- Touch event handling for mobile gestures
- Viewport meta tags for mobile optimization
- Media queries for breakpoints (mobile: <768px, tablet: 768-1024px, desktop: >1024px)

#### 2.1.3 Reading Preferences

**User Experience:**

- Reader controls panel (accessible via settings icon):
- **Font size**: Slider or buttons (8pt to 24pt range)
- **Line spacing**: Tight, Normal, Loose (1.0x, 1.5x, 2.0x)
- **Page width / margins**: Narrow, Medium, Wide
- **Font family**: Serif (default), Sans-serif, Monospace options
- **Themes**:
- Light (white background, black text)
- Dark (black/dark gray background, light text)
- Sepia (warm beige background, dark brown text)
- Optional "Night" variant: Warmer tones, reduced blue light
- Preferences apply immediately and persist across:
- All books in the library
- Browser sessions
- Device (local storage only in Stage 1)

**Technical Considerations:**

- CSS custom properties (variables) for theme colors
- localStorage for preference persistence
- Dynamic CSS injection for real-time theme switching

#### 2.1.4 Local Progress & Session Continuity

**User Experience:**

- For each book, the app tracks:
- Last reading position (page number, location, or scroll position)
- Overall reading progress (percentage complete)
- Last opened timestamp
- On app return:
- Library shows "Continue reading" indicator on last-opened book
- Opening a book automatically resumes from last position
- Progress bar reflects current completion status
- Works entirely offline after initial upload

**Technical Considerations:**

- IndexedDB storage for book progress data
- EPUB: Track by spine item and position within item
- PDF: Track by page number
- Resume logic: Parse stored position and navigate to it on book open

#### 2.1.5 Dictionary & Word Lookup (Guest Mode)

**User Experience:**

- In reader: User selects a word or phrase
- Popup appears with:
- Word definition (concise, 1-3 sentences)
- Part of speech
- Example usage (if available)
- "More" link to full definition (optional)
- Behavior:
- Works offline if dictionary data is cached
- Graceful fallback: "Definition not available" message
- No sign-in required

**Technical Considerations:**

- **Free dictionary sources**:
- **Wiktionary API** (free, open-source, multiple languages)
- **Free Dictionary API** (https://dictionaryapi.dev/ - free, no key required)
- **Offline fallback**: Pre-downloaded common words dictionary (optional)
- Text selection API: `window.getSelection()`
- Popup positioning: Calculate based on selection coordinates
- Caching: Store recent lookups in IndexedDB for offline access

**Risks & Fallbacks:**

- If free APIs are rate-limited: Implement client-side caching, request throttling
- If APIs unavailable: Show "Definition unavailable" gracefully, allow manual note-taking instead

#### 2.1.6 Basic Highlights, Notes, and Bookmarks (Local-Only)

**User Experience:**

- **Highlights**:
- Select text → highlight button appears → apply highlight (default color: yellow)
- Highlighted text is visually distinct when reading
- Tap highlight to view/edit/delete
- **Notes**:
- Attach note to highlighted text or specific location
- Short text note (max 500 characters)
- Notes appear as icons/badges in reading view
- **Bookmarks**:
- One-tap bookmark button saves current location
- Bookmark list accessible from reader menu
- Navigate to bookmarked locations
- Annotations visible when re-reading the book
- All annotations stored locally on device only

**Technical Considerations:**

- Text selection tracking: Store selection range (start/end positions)
- Highlight rendering: Overlay colored spans on text
- Storage: IndexedDB for annotations (book ID, type, location, content)
- EPUB: Use CFI (Canonical Fragment Identifier) or similar for location tracking
- PDF: Use page number + coordinates for location tracking

#### 2.1.7 Local Storage Concept

**Storage Architecture:**

- **IndexedDB** (primary):
- Book files (EPUB/PDF binary data)
- Book metadata (title, author, cover, format)
- Reading progress (book ID, position, percentage)
- Annotations (highlights, notes, bookmarks)
- Dictionary cache (recent lookups)
- **localStorage** (secondary):
- User preferences (theme, font size, spacing, margins)
- UI state (last viewed library view, sidebar state)
- App version (for migration purposes)
- **No external storage**: All data remains on user's device
- **Data persistence**: Survives browser restarts, cleared only if user explicitly clears browser data

#### 2.1.8 Offline-Friendly Behavior

**User Experience:**

- Once a book is uploaded:
- Book file stored locally in IndexedDB
- Reading works entirely offline
- Dictionary lookups work if cached
- Annotations work offline
- App can be installed as PWA (Progressive Web App) for app-like experience
- Service Worker caches app shell (HTML, CSS, JS) for offline access
- If internet is required (e.g., dictionary lookup), app gracefully degrades

**Technical Considerations:**

- Service Worker for offline support
- IndexedDB for book storage (large files)
- Cache API for app assets
- Manifest.json for PWA installation

### 2.2 Stage 1 User Flows

**Flow 1: First-Time Visit → Upload → Read → Return**

1. User opens app in browser
2. Sees empty library with "Upload a book" prompt
3. Clicks upload → selects EPUB or PDF file
4. Book appears in library with cover and metadata
5. User taps book → opens reader at beginning
6. User reads, adjusts preferences (font, theme)
7. User closes browser or navigates away
8. User returns later → opens app → sees book in library with progress indicator
9. User taps book → resumes from last position

**Flow 2: Multiple Books Management**

1. User uploads 3-4 books
2. Library shows all books with progress indicators
3. User opens Book A, reads for a while
4. User returns to library, opens Book B
5. Each book maintains independent progress
6. User can remove books from library (with confirmation)

**Flow 3: Dictionary & Annotations as Guest**

1. User is reading a book
2. User selects word "serendipity"
3. Dictionary popup shows definition
4. User highlights a passage
5. User adds a note to the highlight: "Great quote!"
6. User bookmarks current page
7. All annotations persist locally
8. User returns to book later → sees highlights, notes, bookmarks intact

---

## Part 3: Stage 2 – Connected & Integrated Reader

### 3.1 Accounts & Profiles (Optional)

**User Experience:**

- **Sign-up/Sign-in** (optional):
- Email/password or OAuth (Google, GitHub)
- Basic profile: Name, avatar (optional)
- **Guest mode remains first-class**:
- All Stage 1 features work without account
- Sign-in is opt-in, not required
- **Signed-in benefits**:
- Library syncs across devices
- Reading progress syncs
- Annotations sync
- Preferences sync
- Smoother experience due to data storage on server instead of client
- **Profile page**:
- Reading stats overview
- Account settings
- Privacy controls

**Technical Considerations:**

- Authentication: JWT tokens, secure session management
- Backend: Simple REST API or serverless functions
- Database: User accounts, sync metadata
- Guest data migration: Option to "upgrade" local library to account on sign-in

### 3.2 Advanced Library & Bookshelf

**User Experience:**

- **Shelves/Collections**:
- Default shelves: "All Books", "Currently Reading", "To Read", "Finished"
- Custom shelves: User-created lists (e.g., "Sci-Fi", "Philosophy")
- Drag-and-drop to organize books
- **Sorting & Filtering**:
- Sort by: Title, Author, Last Opened, Added Date, Progress
- Filter by: Format (EPUB/PDF), Source (Uploaded/Catalog), Status, Shelf
- **Book Detail View**:
- Rich metadata panel:
  - Title, Author, Description, Language, Tags/Genres
  - Cover image (full size)
  - Source attribution (if from catalog)
- Reading stats:
  - Percent complete
  - Time spent reading (if tracked)
  - Last opened time
  - Total annotations count
- Actions: Edit metadata, Change shelf, Remove from library

**Technical Considerations:**

- Metadata enhancement: Fetch from Open Library API or similar for catalog books
- Shelf management: Tag-based or collection-based system
- Search: Client-side search across library metadata

### 3.3 Reader Experience – Advanced Features

#### 3.3.1 Navigation & Structure

- **Table of Contents Panel**:
- Sidebar or modal with full TOC
- Current chapter highlighted
- Click to jump to chapter
- **Chapter List**:
- List view of all chapters with progress indicators
- "Go to Chapter X" quick navigation
- **"Go to" Feature**:
- Jump to specific chapter by name
- Jump to percentage (e.g., "Go to 50%")
- Jump to page number (for PDFs)

#### 3.3.2 Search Within Book

- **Search Bar**:
- Full-text search input in reader toolbar
- Real-time search as user types (debounced)
- Shows match count (e.g., "15 matches found")
- **Search Results**:
- Highlight all matches in text
- Navigation buttons: Previous/Next match
- Scroll to match on navigation
- Search results list (optional): Shows context snippets

**Technical Considerations:**

- Client-side search: Index book text on load or use full-text search library
- Performance: For large books, consider chunked indexing or server-side search (Stage 2)

#### 3.3.3 Reading Modes

- **Paged Mode**:
- Tap/click to advance page-by-page
- Page numbers visible
- Smooth page transitions
- **Continuous Scrolling Mode**:
- Infinite scroll through book
- Progress indicator updates continuously
- No page breaks
- **Mode Switching**:
- Toggle in reader settings
- Preference remembered per book or globally

#### 3.3.4 Reading Metrics & Stats

- **In-Reader Stats**:
- Percentage completed (always visible)
- Estimated time left in chapter (based on reading speed)
- Estimated time left in book
- **"My Reading Stats" Page**:
- Total time read (hours/minutes)
- Books completed count
- Pages/locations read per day (graph)
- Reading streak: Days in a row with reading activity
- Average reading speed (words per minute)
- **Privacy**: Stats can be disabled in settings

**Technical Considerations:**

- Reading speed calculation: Track time spent reading vs. content consumed
- Streak logic: Daily reading activity detection (minimum threshold: e.g., 3 pages)

#### 3.3.5 Distraction-Free Mode

- **Full-Screen Reading**:
- Hide all toolbars, menus, progress bars
- Minimal UI: Just text content
- **Reveal Controls**:
- Tap/click anywhere to show controls temporarily
- Auto-hide after inactivity
- Subtle handle/indicator for controls access

### 3.4 Full Highlights, Notes, Bookmarks & Exports

**User Experience:**

- **Enhanced Highlights**:
- Multiple colors/styles: Yellow (default), Green, Blue, Pink, Orange
- Style options: "Important", "Quote", "Idea", "Question"
- Highlight management: View all highlights in book, edit/delete
- **Rich Notes**:
- Text notes attached to selections or locations
- Notes can be standalone (location bookmark with note)
- Notes editor: Rich text or markdown support (optional)
- **Bookmarks**:
- Named bookmarks (user can add label)
- Bookmark list with thumbnails/previews
- Quick navigation to bookmarks
- **Global Notes & Highlights**:
- Central page: "My Notes" or "All Annotations"
- View all annotations across all books
- Filter by: Book, Tag, Date, Type (highlight/note/bookmark)
- Search within annotations
- **Exports**:
- Export annotations per book as:
  - Plain text (.txt)
  - Markdown (.md)
  - CSV (for data analysis)
- Export includes:
  - Book title and author
  - Highlighted text with location reference
  - Notes with associated highlights
  - Chapter/page references
  - Timestamp of annotation

**Guest vs Signed-in Behavior:**

- **Guest mode**: All annotations local, exports work locally (download file)
- **Signed-in mode**: Annotations are backed up and sync across devices, exports can be saved to cloud or downloaded

### 3.5 Dictionary, X-Ray-like Context & Knowledge Features

#### 3.5.1 Expanded Dictionary

- **Richer Definitions**:
- Multiple definitions per word
- Example sentences
- Etymology (if available from free sources)
- Synonyms and antonyms
- **Multiple Languages**:
- Dictionary language selection in settings
- Support for major languages (where free APIs available)
- Translation feature (using free translation APIs like LibreTranslate)

**Technical Considerations:**

- **Free dictionary sources**:
- Wiktionary API (multilingual, comprehensive)
- Free Dictionary API (English focus)
- WordNet (open-source lexical database)
- **Translation APIs**:
- LibreTranslate (self-hosted or public instance)
- Google Translate API (free tier limited)
- Fallback: Manual translation via user input

#### 3.5.2 X-Ray-like Feature (Conceptual)

- **Character & Term Index**:
- Extract key characters, places, terms from book (if metadata available)
- Show "X-Ray" panel with:
  - Character list with descriptions
  - Places mentioned
  - Key terms/concepts
- Click term to see all occurrences in book
- **Book Insights Panel**:
- Summary of book themes (if available from open sources)
- Related books suggestions (based on open catalogs)

**Technical Considerations:**

- **Challenges**: Requires book-specific metadata that may not be available for all books
- **Approach**: 
- Use Open Library or similar for metadata enrichment
- Manual extraction from EPUB metadata (if present)
- User-contributed content (community-driven, optional)
- **Fallback**: If metadata unavailable, skip X-Ray feature gracefully (not critical)

### 3.6 Open/Free Book Catalogs & Discovery

#### 3.6.1 Catalog Integrations

**Sources to Integrate:**

- **Project Gutenberg**:
- API: https://www.gutenberg.org/ (REST API available)
- Content: Public domain books, multiple formats (EPUB, HTML, TXT)
- Metadata: Title, author, subject, language
- **Standard Ebooks**:
- API: OPDS feed or direct EPUB downloads
- Content: High-quality, curated public domain EPUBs
- Metadata: Enhanced metadata, covers, descriptions
- **Open Library**:
- API: https://openlibrary.org/developers/api
- Content: Metadata, some public domain EPUBs, borrow links
- Features: Ratings, reviews, reading lists
- **Other OPDS Catalogs**:
- Feedbooks Public Domain
- ManyBooks (public domain section)
- Internet Archive (public domain books)

**Technical Considerations:**

- **OPDS (Open Publication Distribution System)**:
- Standard protocol for ebook catalogs
- Supports search, browse, download
- Many free catalogs provide OPDS feeds
- **API Integration**:
- Fetch book metadata and covers
- Download EPUB files directly to user's library
- Cache metadata locally for offline browsing
- **Rate Limiting**: Respect API rate limits, implement client-side caching

#### 3.6.2 Explore / Discover Section

**User Experience:**

- **Global Search**:
- Search across all integrated catalogs
- Search by: Title, Author, Subject/Genre
- Results show source (e.g., "From Project Gutenberg")
- **Browse by Category**:
- Genres: Fiction, Non-fiction, Science, Philosophy, etc.
- Subjects: History, Literature, Science Fiction, etc.
- Languages: Filter by language
- Length: Short (<100 pages), Medium (100-300), Long (>300)
- **Curated Sections**:
- "Popular Classics" (most downloaded)
- "Recently Added" (new public domain releases)
- "Short Reads" (books <100 pages)
- "Collections by Theme" (e.g., "Victorian Literature", "Ancient Philosophy")
- **Book Detail for Catalog Books**:
- Full metadata: Title, author, description, publication date
- Source label: "From Project Gutenberg" with link
- Rights information: "Public Domain" badge
- Cover image
- "Add to My Library" button (downloads EPUB to local library)
- Preview option (read first chapter before adding)

**Guest vs Signed-in Behavior:**

- **Guest**: Can browse, search, and add books to local library (stored on device)
- **Signed-in**: Library syncs across devices; catalog books associated with account

### 3.7 Ratings, Reviews & Social Aspects

#### 3.7.1 Internal Ratings & Reviews

- **Per-Book Ratings**:
- Star rating (1-5 stars)
- Average rating displayed on book detail
- Rating count (e.g., "4.2 stars from 15 ratings")
- **User Reviews**:
- Write, edit, delete own reviews
- Review includes: Rating + text review (optional)
- Reviews visible to all users (if signed in) or local only (guest)
- Sort reviews by: Most helpful, Most recent, Highest rated

**Technical Considerations:**

- Backend required for reviews (Stage 2)
- Guest reviews: Stored locally, not shared
- Signed-in reviews: Stored in database, visible to community

#### 3.7.2 External Social Proof

- **Popularity Indicators**:
- Download counts from Project Gutenberg (if available via API)
- Open Library ratings/reviews (if available)
- Display as "Popular on [Source]" badge
- **Reading Activity**:
- "Recently Finished" section (community-wide, if signed in)
- "Most-Read Books" list
- Reading streak leaderboard (optional, privacy-respecting)

#### 3.7.3 Social Sharing

- **Quote Sharing**:
- Select text → "Share Quote" button
- Generates shareable text: Quote + book attribution
- Copy to clipboard or share via Web Share API
- Format: "Quote text" — Author, Book Title

**Technical Considerations:**

- All features use free/open APIs only
- No paid social media integrations
- Privacy: Users can opt out of social features

### 3.8 Sync & Multi-Device Behavior

**What Syncs (Signed-in Users):**

- **Library**: All books (uploaded + catalog-sourced)
- **Reading Progress**: Current position, percentage, last opened time
- **Annotations**: Highlights, notes, bookmarks
- **Preferences**: Theme, font, spacing, reading mode
- **Stats**: Reading time, streaks, completed books

**User Expectations:**

- **New Device Login**:
- Library appears with all books
- Reading progress restored
- Annotations available
- Preferences applied
- **Offline Reading**:
- Read on Device A offline
- Progress and annotations sync when connection returns
- Device B sees updated progress after sync
- **Conflict Resolution**:
- **Progress**: Most recent position wins (timestamp-based)
- **Annotations**: Merge (no duplicates, preserve all)
- **Preferences**: User's last-saved preference wins

**Guest Experience:**

- Remains fully independent
- No sync attempted
- Local data only
- Option to "upgrade" to account and migrate data on sign-in

**Technical Considerations:**

- Sync strategy: Periodic sync (on app open, on changes) or real-time (WebSocket)
- Conflict resolution: Last-write-wins for progress, merge for annotations
- Data format: JSON for sync payloads
- Encryption: Sensitive data encrypted in transit (HTTPS) and at rest

### 3.9 Settings, Accessibility & Privacy

#### 3.9.1 Reading Settings

- Default theme, font, spacing, margins
- Default reading mode (paged vs scrolling)
- Dictionary language
- Auto-hide UI timeout

#### 3.9.2 Language & Localization

- UI language selection (English, Spanish, French, etc.)
- Dictionary language preferences
- Date/time format preferences

#### 3.9.3 Accessibility

- **High-Contrast Theme**: Enhanced contrast for visibility
- **Larger Touch Targets**: Increased button/control sizes
- **Keyboard Navigation**: Full keyboard support for desktop
- Arrow keys: Navigate pages
- Space/Enter: Next page
- Esc: Close modals
- Tab: Navigate controls
- **Screen Reader Support**: ARIA labels, semantic HTML
- **Font Options**: Dyslexia-friendly fonts (OpenDyslexic, etc.)
- **Line Height & Margins**: Configurable for readability

#### 3.9.4 Privacy & Data Control

- **Guest Mode**:
- "Clear Local Library" button (removes all books and data)
- "Clear Reading History" (removes progress, keeps books)
- "Clear Annotations" (removes highlights/notes, keeps books)
- **Signed-in Mode**:
- Privacy settings: What syncs vs. kept local
- Data export: Download all user data (JSON)
- Account deletion: Remove account and all synced data
- Reading history: Option to disable tracking

---

## Part 4: Phased Development Plan

### Phase 0: Foundation & Core Reader (Stage 1 - Part 1)

**Goal**: Basic local-only reading experience

**Features:**

- File upload (EPUB, PDF)
- Local library view (title, author, cover, progress)
- Basic reader view (responsive, mobile/tablet/desktop)
- Page navigation (next/previous, scroll)
- Reading preferences (font size, line spacing, themes: light/dark/sepia)
- Local progress tracking (resume from last position)
- Local storage (IndexedDB for books, localStorage for preferences)
- Offline support (Service Worker, PWA manifest)

**Dependencies:**

- EPUB.js or similar for EPUB rendering
- PDF.js for PDF rendering
- IndexedDB API for storage

**Deliverable**: Working local reader that can upload, store, and read books offline

---

### Phase 1: Enhanced Reader & Annotations (Stage 1 - Part 2)

**Goal**: Rich reading experience with dictionary and annotations

**Features:**

- Dictionary lookup (free API integration: Wiktionary or Free Dictionary API)
- Text selection and highlighting
- Basic notes (attach to highlights or locations)
- Bookmarks (save and navigate to locations)
- Table of contents navigation
- In-book search (full-text search within loaded book)
- Reading modes (paged vs continuous scroll)
- Distraction-free mode

**Dependencies:**

- Phase 0 complete
- Free dictionary API access
- Text selection and range tracking APIs

**Risks & Fallbacks:**

- Dictionary API unavailable: Graceful degradation, show "Definition unavailable"
- Large book search performance: Implement chunked indexing or limit search scope

**Deliverable**: Full-featured local reader with dictionary and annotations

---

### Phase 2: Accounts & Sync (Stage 2 - Part 1)

**Goal**: Optional accounts with cross-device sync

**Features:**

- User authentication (email/password, optional OAuth)
- User profiles
- Library sync across devices
- Reading progress sync
- Annotations sync (highlights, notes, bookmarks)
- Preferences sync
- Conflict resolution (progress: last-write-wins, annotations: merge)
- Guest mode remains fully functional

**Dependencies:**

- Phase 1 complete
- Backend infrastructure (REST API or serverless)
- Database for user accounts and sync data
- Authentication system

**Technical Considerations:**

- Backend: Node.js/Express, Python/Flask, or serverless (Vercel, Netlify Functions)
- Database: PostgreSQL, MongoDB, or Firebase (free tier)
- Sync strategy: Periodic sync on app open/close, or real-time (WebSocket)

**Deliverable**: Optional sign-in with full sync capabilities

---

### Phase 3: Open Catalog Integration & Discovery (Stage 2 - Part 2)

**Goal**: Free book discovery and catalog browsing

**Features:**

- Project Gutenberg integration (search, browse, download)
- Standard Ebooks integration (OPDS feed or direct download)
- Open Library integration (metadata, some EPUBs)
- Explore/Discover section (search, browse by genre, curated lists)
- Book detail pages for catalog books
- "Add to Library" from catalog (downloads EPUB locally)
- Catalog metadata enrichment (covers, descriptions)

**Dependencies:**

- Phase 2 complete (for signed-in catalog access)
- OPDS client library or custom implementation
- API integrations with free catalogs

**Risks & Fallbacks:**

- Catalog API changes: Implement versioning, fallback to direct downloads
- Rate limiting: Client-side caching, request throttling
- Missing metadata: Use placeholder data, allow user editing

**Deliverable**: Full catalog browsing and free book discovery

---

### Phase 4: Social Features & Advanced Knowledge (Stage 2 - Part 3)

**Goal**: Community features and enhanced dictionary/knowledge tools

**Features:**

- Ratings and reviews (per book, user-contributed)
- Reading stats page (time read, streaks, completed books)
- Global annotations view (all notes/highlights across books)
- Annotation exports (plain text, markdown, CSV)
- Enhanced dictionary (multiple definitions, examples, etymology)
- Translation feature (using LibreTranslate or similar)
- X-Ray-like feature (character/term index, if metadata available)
- Social sharing (quote sharing with attribution)
- Reading activity features (recently finished, most-read books)

**Dependencies:**

- Phase 3 complete
- Backend for reviews and social features
- Enhanced dictionary APIs or offline dictionaries
- Translation API (free tier)

**Risks & Fallbacks:**

- X-Ray metadata unavailable: Skip feature gracefully, focus on user-contributed content
- Translation API limits: Implement caching, fallback to manual input
- Social features low adoption: Keep lightweight, focus on personal stats

**Deliverable**: Complete social and knowledge features

---

### Phase 5: Polish & Advanced Features (Optional)

**Goal**: Refinement and advanced optimizations

**Features:**

- Advanced typography (more font options, custom fonts)
- Reading analytics (detailed reading speed, comprehension metrics)
- Collections and custom shelves (user-created book lists)
- Advanced search (search across library, filter by multiple criteria)
- Book recommendations (based on reading history, if privacy-allowed)
- Accessibility enhancements (screen reader optimization, keyboard shortcuts)
- Performance optimizations (lazy loading, virtual scrolling for large libraries)
- Mobile app wrappers (PWA to native app via Capacitor/Electron)

**Dependencies:**

- All previous phases
- Performance profiling and optimization
- Accessibility testing

**Deliverable**: Polished, production-ready e-reader

---

## Part 5: Technical Architecture Overview (Conceptual)

### 5.1 Frontend Architecture

**Core Technologies (to be chosen):**

- **Framework**: React, Vue, or vanilla JS (consider bundle size for offline support)
- **State Management**: Context API, Redux, or Zustand (for complex state)
- **Routing**: React Router or similar (for library/reader views)
- **Styling**: CSS-in-JS, Tailwind, or plain CSS (responsive design critical)

**Key Libraries:**

- **EPUB Rendering**: EPUB.js, Readium.js, or similar
- **PDF Rendering**: PDF.js (Mozilla)
- **Storage**: IndexedDB (via idb or Dexie.js wrapper)
- **Offline**: Workbox or custom Service Worker
- **Dictionary**: Free Dictionary API, Wiktionary API client

### 5.2 Backend Architecture (Stage 2)

**Core Technologies (to be chosen):**

- **Runtime**: Node.js, Python, or serverless functions
- **Database**: PostgreSQL, MongoDB, or Firebase (free tier)
- **Authentication**: JWT tokens, OAuth providers
- **File Storage**: For synced books (optional): S3-compatible storage or user's own storage

**API Design:**

- RESTful API for sync operations
- WebSocket (optional) for real-time sync
- Rate limiting and authentication middleware

### 5.3 Data Models (Conceptual)

**Book:**

- id, title, author, cover, format (EPUB/PDF), source (uploaded/catalog), metadata

**Reading Progress:**

- bookId, position, percentage, lastOpened, timeSpent

**Annotation:**

- id, bookId, type (highlight/note/bookmark), location, content, color (for highlights), timestamp

**User (Stage 2):**

- id, email, profile, preferences, createdAt

**Sync Metadata:**

- userId, entityType, entityId, lastSynced, version (for conflict resolution)

---

## Part 6: Open-Source & Free-Only Constraints

### 6.1 Required Free/Open Sources

**Dictionary:**

- ✅ Wiktionary API (free, open-source)
- ✅ Free Dictionary API (free, no key)
- ⚠️ Fallback: Offline dictionary database (if available)

**Book Catalogs:**

- ✅ Project Gutenberg (public domain, free API)
- ✅ Standard Ebooks (free, OPDS feed)
- ✅ Open Library (free API, some public domain EPUBs)
- ✅ Internet Archive (public domain books)

**Translation:**

- ✅ LibreTranslate (open-source, self-hosted or public instance)
- ⚠️ Google Translate API (free tier limited, not preferred)

**Metadata:**

- ✅ Open Library API (free metadata)
- ✅ Project Gutenberg metadata (free)

### 6.2 Features Requiring Free Alternatives

**If no free alternative exists:**

- Mark feature as "Future / Optional"
- Provide graceful fallback (e.g., manual input instead of auto-translation)
- Document limitation clearly to users

---

## Part 7: Success Criteria

### Stage 1 Success Criteria:

- ✅ User can upload EPUB/PDF and read offline
- ✅ Reading experience is smooth on mobile, tablet, desktop
- ✅ Progress and preferences persist across sessions (local)
- ✅ Dictionary lookup works (with free API)
- ✅ Basic annotations work (highlights, notes, bookmarks)
- ✅ No sign-in required for core functionality

### Stage 2 Success Criteria:

- ✅ Optional sign-in enables cross-device sync
- ✅ Catalog browsing and free book discovery works
- ✅ Social features (ratings, reviews) are functional
- ✅ Guest mode remains fully capable
- ✅ All features use only free/open sources

---

## Part 8: Risks & Mitigations

### 8.1 Technical Risks

**Large File Handling:**

- Risk: Browser memory limits for large EPUBs/PDFs
- Mitigation: Chunked loading, virtual scrolling, lazy rendering

**Offline Storage Limits:**

- Risk: IndexedDB quota limits (browser-dependent, typically 50% of disk)
- Mitigation: Compression, user warnings, optional cloud storage (Stage 2)

**Dictionary API Reliability:**

- Risk: Free APIs may be rate-limited or unavailable
- Mitigation: Client-side caching, multiple API fallbacks, graceful degradation

### 8.2 Feature Risks

**X-Ray Feature:**

- Risk: Requires book-specific metadata not always available
- Mitigation: Make feature optional, use available metadata, user-contributed content

**Catalog Integration:**

- Risk: Catalog APIs may change or become unavailable
- Mitigation: Version API clients, implement fallback downloads, cache metadata

**Sync Conflicts:**

- Risk: Complex conflict resolution for annotations
- Mitigation: Simple merge strategy, last-write-wins for progress, user notification for conflicts

---

## Conclusion

This plan provides a comprehensive roadmap for building iReader as a free, open-source, browser-based e-book reader that rivals Kindle's user experience while respecting guest-first usage and open-source constraints. The phased approach ensures a solid foundation (Stage 1) before adding connected features (Stage 2), with clear dependencies and risk mitigation strategies throughout.