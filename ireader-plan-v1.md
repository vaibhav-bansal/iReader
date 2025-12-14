---
name: PDF Reader Tech Stack
overview: Recommendations for a lightweight web-based PDF reader with infinite scroll, progress tracking, and cross-device sync using React + Vite, PDF.js, Supabase, and Vercel hosting.
todos:
  - id: setup-project
    content: "Initialize React + Vite project and install core libraries: react-pdf, @tanstack/react-query, zustand, react-router-dom, tailwindcss, react-dropzone, react-infinite-scroll-component, react-hot-toast, @supabase/supabase-js"
    status: pending
  - id: integrate-react-pdf
    content: Set up react-pdf Document and Page components (no custom PDF rendering code needed)
    status: pending
  - id: infinite-scroll-setup
    content: Wrap react-pdf with react-infinite-scroll-component library (configure hasMore, loadMore callbacks)
    status: pending
  - id: progress-tracking-zustand
    content: Add progress tracking using zustand with persist middleware (automatic localStorage handling)
    status: pending
  - id: supabase-setup
    content: "Set up Supabase project: create database schema (books, reading_progress tables), configure Storage bucket, enable Google OAuth"
    status: pending
  - id: auth-supabase
    content: Implement authentication using @supabase/supabase-js auth methods (signInWithOAuth, signOut, getSession)
    status: pending
  - id: file-upload-dropzone
    content: Implement PDF upload using react-dropzone component with Supabase Storage API (use storage.from().upload())
    status: pending
  - id: library-view-query
    content: Create library view using @tanstack/react-query useQuery to fetch books list from Supabase
    status: pending
  - id: progress-sync-query
    content: Implement progress sync using @tanstack/react-query useMutation (automatic optimistic updates, error handling, retry logic)
    status: pending
  - id: polish-toasts
    content: Add user feedback using react-hot-toast for upload success/errors, use React Query's built-in loading/error states
    status: pending
---

# PDF Reader Tech Stack Recommendation

## Library-First Philosophy

**Zero Custom Logic**: This plan prioritizes using established, well-maintained libraries for every feature. You'll be **composing libraries**, not writing algorithms.

- ✅ PDF rendering → `react-pdf` (handles all PDF.js complexity)
- ✅ Infinite scroll → `react-infinite-scroll-component` (viewport detection, loading logic)
- ✅ File upload → `react-dropzone` (drag-drop, progress, validation)
- ✅ Data fetching/sync → `@tanstack/react-query` (caching, optimistic updates, retries)
- ✅ State management → `zustand` (with persist middleware for localStorage)
- ✅ Progress tracking → Built into React Query mutations
- ✅ Authentication → `@supabase/supabase-js` auth methods
- ✅ File storage → Supabase Storage API
- ✅ UI components → `shadcn/ui` or `Radix UI` (headless, accessible)

**Result**: Minimal custom code, maximum library power, active community support.

---

## Recommended Technology Stack

### Frontend Framework

**React + Vite** (Recommended)

- **Why**: Lighter than Next.js for client-heavy apps, fast HMR, excellent tree-shaking
- **Alternative**: Next.js (if you want SSR/SSG benefits, but adds complexity for a PDF reader)
- **Bundle size**: ~40-50KB gzipped for React + ReactDOM

### PDF Rendering

**react-pdf** (by Wojciech Maj) - Most Popular Choice

- **Why**: 11k+ GitHub stars, 1.9M weekly npm downloads, actively maintained
- **Library**: `react-pdf` + `pdfjs-dist` (wrapper around PDF.js)
- **Features**: Built-in page rendering, zoom, rotation, text selection
- **Bundle size**: ~250KB (includes PDF.js)
- **Alternative**: `react-view-pdf` (simpler, less features)

### Authentication & Backend

**Supabase** (Recommended - All-in-one solution)

- **Auth**: Built-in Google OAuth (one-click setup)
- **Database**: PostgreSQL for reading progress, metadata
- **Storage**: Built-in storage for PDF files (with CDN)
- **Real-time**: Optional real-time sync (WebSocket-based)
- **Free tier**: Generous limits for personal use

### Hosting

**Vercel** (Recommended)

- **Why**: Optimized for React apps, automatic deployments, edge network
- **Deployment**: Connect GitHub repo for CI/CD
- **Free tier**: More than sufficient for your use case

### State Management

**Zustand** or **React Context API**

- **Why**: Zustand is ~1KB, simpler than Redux, perfect for this scale
- **Alternative**: React Context (built-in, zero dependencies)

### Styling

**Tailwind CSS** (Recommended)

- **Why**: Utility-first, small production bundle (~10KB with purging)
- **Benefits**: Fast development, responsive design, dark mode support

### Routing

**React Router v6** (Recommended)

- **Why**: Standard, lightweight (~20KB), handles library/reader navigation

### Additional Libraries (All Popular, Well-Maintained)

**File Upload:**

- **react-dropzone**: Drag-and-drop file upload (10k+ stars, 2M+ weekly downloads)
- **react-uploady**: Modern hooks-based upload with progress tracking (alternative)

**Infinite Scroll:**

- **react-infinite-scroll-component**: Most popular infinite scroll library (6k+ stars, 700k+ weekly downloads)
- **Alternative**: `react-intersection-observer` + `use-infinite-query` (TanStack Query) for more control

**State & Data Fetching:**

- **@tanstack/react-query** (TanStack Query): Data fetching, caching, sync (45k+ stars, 4M+ weekly downloads)
- **zustand**: State management (40k+ stars, 1.5M+ weekly downloads)

**UI Components (Optional but Recommended):**

- **shadcn/ui**: High-quality component library built on Radix UI (70k+ stars)
  - Or use **Radix UI** directly for headless components
  - Provides: Dialog, Dropdown, Toast, etc.

**Utilities:**

- **date-fns**: Date utilities (14k+ stars, 20M+ weekly downloads)
- **clsx** or **classnames**: Conditional className utility
- **zod**: Schema validation (if using TypeScript or want runtime validation)
- **react-hot-toast**: Toast notifications (5k+ stars, 800k+ weekly downloads)

---

## Architecture Overview

### Data Flow

```
User Upload → Vercel (Static) → PDF.js Render → Canvas Elements
                                           ↓
                    Supabase Storage (PDF files)
                                           ↓
                    Supabase Database (Progress, Metadata)
                                           ↓
                    Supabase Auth (Google Sign-in)
```

### Database Schema (Supabase)

**books**

- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `title` (text)
- `file_name` (text)
- `file_path` (text, Supabase Storage path)
- `file_size` (bigint)
- `total_pages` (integer)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**reading_progress**

- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `book_id` (uuid, foreign key to books)
- `current_page` (integer)
- `scroll_position` (float, 0-1 normalized)
- `last_read_at` (timestamptz)
- `updated_at` (timestamptz)
- Unique constraint: (user_id, book_id)

### File Structure

```
/src
  /components
    /ui                    # shadcn/ui components (Button, Dialog, etc.)
    PDFReader.jsx          # Uses react-pdf Document/Page components
    Library.jsx            # Library view (list of books)
    BookCard.jsx           # Individual book card component
  /lib
    supabase.js            # Supabase client initialization (from @supabase/supabase-js)
  App.jsx
  main.jsx
```

**Key Point**: Most logic handled by libraries:

- PDF rendering: `react-pdf` components
- File upload: `react-dropzone` component
- Infinite scroll: `react-infinite-scroll-component` wrapper
- Data fetching/sync: `@tanstack/react-query` hooks
- State: `zustand` store (minimal custom code)

---

## Implementation Strategy (Library-First Approach)

### Phase 1: Core PDF Reader (Local Only)

1. Set up React + Vite project
2. Install `react-pdf`: Use `<Document>` and `<Page>` components directly
3. Wrap with `react-infinite-scroll-component`: Configure to load next page on scroll
4. Add basic controls: Use `react-pdf`'s built-in zoom props
5. Store progress: Use `zustand` persist middleware (handles localStorage automatically)

### Phase 2: Authentication & Backend

1. Set up Supabase project
2. Configure Google OAuth (built into Supabase dashboard)
3. Create database schema (SQL migration)
4. Use `@supabase/supabase-js` auth methods: `signInWithOAuth()`, `signOut()`

### Phase 3: File Upload & Storage

1. Use `react-dropzone`: Configure for PDF files, drag-and-drop support
2. Upload progress: `react-dropzone` provides `onUploadProgress` callback
3. Upload to Supabase: Use `@supabase/supabase-js` Storage API (`storage.from('bucket').upload()`)
4. Library view: Use `@tanstack/react-query` to fetch books list

### Phase 4: Progress Sync

1. Use `@tanstack/react-query` mutations: Auto-sync progress on scroll
2. Conflict resolution: Use React Query's built-in optimistic updates + conflict handling
3. Load progress: React Query's `useQuery` with Supabase fetch
4. Real-time sync: Use Supabase Realtime subscriptions (built-in, no custom code)

### Phase 5: Polish & Optimization

1. Code splitting: Vite's built-in dynamic imports for `react-pdf`
2. Loading states: React Query provides `isLoading`, `isError` states automatically
3. Toast notifications: Use `react-hot-toast` for user feedback
4. Debouncing: Use `use-debounce` library (or React Query's built-in staleTime)

---

## Performance Optimizations

### Library-Based Optimizations (No Custom Code)

**PDF.js (via react-pdf):**

- Use `react-pdf`'s built-in lazy loading: Set `loading` prop
- Virtual scrolling: `react-infinite-scroll-component` handles viewport detection
- Memory management: `react-pdf` handles canvas lifecycle automatically

**Progress Sync (via TanStack Query):**

- Use React Query's `staleTime` and `cacheTime` for debouncing
- Optimistic updates: Built-in with `useMutation` for instant UI updates
- Background sync: React Query automatically handles refetching on focus/reconnect
- Local-first: Use React Query's persistence plugin or Zustand persist middleware

### Bundle Size Optimization

- **Code splitting**: Split PDF viewer into separate chunk
- **Tree shaking**: Ensure unused code is eliminated
- **Compression**: Vercel automatically handles gzip/brotli

---

## Key Technical Decisions

### Why Supabase over separate services?

- **Single platform**: Auth, database, and storage in one place
- **Built-in RLS**: Row-level security for multi-user support
- **Real-time**: Optional WebSocket sync without additional infrastructure
- **Free tier**: 500MB database, 1GB storage, 50K monthly active users

### Why React + Vite over Next.js?

- **Smaller bundle**: No SSR overhead for client-heavy PDF rendering
- **Faster dev server**: Vite's HMR is significantly faster
- **Simpler deployment**: Static site, no serverless functions needed initially
- **Better for infinite scroll**: Client-side rendering is ideal for PDF.js

### Why PDF.js over alternatives?

- **Mature & stable**: Used by Firefox, many production apps
- **Active development**: Regular updates and security patches
- **Well-documented**: Extensive examples and community support
- **Canvas rendering**: Perfect for infinite scroll implementation

---

## Estimated Bundle Sizes (Production, Gzipped)

- React + ReactDOM: ~45KB
- react-pdf + pdfjs-dist: ~250KB (includes PDF.js)
- @tanstack/react-query: ~15KB
- Tailwind CSS: ~10KB (purged)
- React Router: ~5KB
- Zustand: ~1KB
- react-dropzone: ~8KB
- react-infinite-scroll-component: ~3KB
- react-hot-toast: ~2KB
- **Total**: ~340KB (still excellent for a feature-rich PDF reader)

---

## Deployment Checklist

1. **Supabase Setup**

   - Create project
   - Enable Google OAuth provider
   - Create database tables
   - Set up Storage bucket with RLS policies

2. **Vercel Setup**

   - Connect GitHub repository
   - Add environment variables (Supabase URL, keys)
   - Configure build settings (Vite defaults work)

3. **Environment Variables**

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## Package Installation (All Popular Libraries)

```bash
# Core
npm install react react-dom react-router-dom
npm install @tanstack/react-query zustand

# PDF
npm install react-pdf pdfjs-dist

# File Upload
npm install react-dropzone

# Infinite Scroll
npm install react-infinite-scroll-component

# UI & Utilities
npm install tailwindcss postcss autoprefixer
npm install react-hot-toast
npm install date-fns clsx

# Supabase
npm install @supabase/supabase-js

# Optional: UI Components
npx shadcn-ui@latest init  # Follow prompts to set up shadcn/ui
npx shadcn-ui@latest add button dialog toast
```

---

## Key Advantages of This Library-First Approach

1. **Zero Custom Logic for Core Features**: PDF rendering, infinite scroll, file upload all handled by libraries
2. **Active Maintenance**: All libraries have 1k+ stars, regular updates, large communities
3. **Type Safety**: Most libraries have TypeScript support (optional)
4. **Battle-Tested**: Millions of downloads/week = proven in production
5. **Minimal Code**: You're primarily composing library components, not writing algorithms
6. **Easy Updates**: Libraries handle optimizations, bug fixes automatically

---

## Next Steps

1. **Validate approach**: Confirm this library-first stack meets your requirements
2. **Set up projects**: Create Supabase project and Vercel account
3. **Install dependencies**: Use the package list above
4. **Follow library docs**: Implement using official examples from each library
5. **Compose components**: Wire libraries together (minimal custom code)

This stack maximizes library usage, minimizing custom code while maintaining **lightweight**, **fast**, and **simple** architecture. You'll primarily be configuring libraries rather than writing complex logic.

---

## Library Documentation & Resources

**Core Libraries:**

- [react-pdf](https://react-pdf.org/) - Official docs with examples
- [@tanstack/react-query](https://tanstack.com/query/latest) - Data fetching guide
- [zustand](https://github.com/pmndrs/zustand) - State management docs
- [react-dropzone](https://react-dropzone.js.org/) - File upload examples
- [react-infinite-scroll-component](https://github.com/ankeetmaini/react-infinite-scroll-component) - Usage examples

**UI & Utilities:**

- [shadcn/ui](https://ui.shadcn.com/) - Component library documentation
- [react-hot-toast](https://react-hot-toast.com/) - Toast notification examples
- [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first CSS

**Backend:**

- [Supabase Auth](https://supabase.com/docs/guides/auth) - Google OAuth setup
- [Supabase Storage](https://supabase.com/docs/guides/storage) - File upload guide
- [Supabase Realtime](https://supabase.com/docs/guides/realtime) - Real-time subscriptions

**All libraries have:**

- ✅ TypeScript definitions (optional)
- ✅ Active GitHub repositories
- ✅ Comprehensive documentation
- ✅ Community support (Discord, GitHub Discussions)