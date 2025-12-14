# iReader - PDF Reader

A lightweight web-based PDF reader with infinite scroll, progress tracking, and cross-device sync.

## Features

- 📚 Upload and manage PDF books
- 📖 Infinite scroll reading experience
- 💾 Automatic progress tracking
- 🔄 Cross-device sync via Supabase
- 🔐 Google Sign-in authentication
- 📱 Responsive design (mobile, tablet, desktop)
- ⚡ Fast and lightweight

## Tech Stack

- **Frontend**: React + Vite
- **PDF Rendering**: react-pdf (PDF.js)
- **Infinite Scroll**: react-infinite-scroll-component
- **File Upload**: react-dropzone
- **State Management**: Zustand with persistence
- **Data Fetching**: TanStack Query (React Query)
- **Backend**: Supabase (Auth, Database, Storage)
- **Styling**: Tailwind CSS
- **Notifications**: react-hot-toast
- **Analytics**: PostHog (with session replays)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account
- Google OAuth credentials (optional, for Google sign-in)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/vaibhav-bansal/iReader.git
cd iReader
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase (see [supabase/README.md](./supabase/README.md)):
   - Create a Supabase project
   - Run the SQL schema from `supabase/schema.sql`
   - Create a Storage bucket named `books`
   - Configure Google OAuth

4. Create `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
VITE_POSTHOG_KEY=your_posthog_project_api_key
VITE_POSTHOG_HOST=https://app.posthog.com
```

**Note**: 
- This app uses Supabase's new publishable keys (format: `sb_publishable_...`). Get your publishable key from Supabase Dashboard → Project Settings → API.
- PostHog is used for analytics and session replays. Get your PostHog key from PostHog Dashboard → Project Settings → Project API Key. If using PostHog Cloud, use `https://app.posthog.com` as the host. For self-hosted instances, use your PostHog instance URL.

5. Start development server:
```bash
npm run dev
```

6. Open [http://localhost:5173](http://localhost:5173) in your browser

## Project Structure

```
src/
  components/
    Auth.jsx          # Authentication wrapper component
  pages/
    Library.jsx       # Library view (book list + upload)
    Reader.jsx        # PDF reader with infinite scroll
  lib/
    supabase.js       # Supabase client initialization
    posthog.js        # PostHog analytics initialization
  store/
    progressStore.js  # Zustand store for reading progress
  App.jsx             # Main app component with routing
  main.jsx            # Entry point
```

## Deployment

### Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_POSTHOG_KEY` (optional, for analytics)
   - `VITE_POSTHOG_HOST` (optional, defaults to `https://app.posthog.com`)
4. Deploy!

The app will be automatically deployed on every push to main branch.

## Usage

1. **Sign in**: Click "Sign in with Google" to authenticate
2. **Upload**: Drag and drop a PDF file or click to select
3. **Read**: Click on any book to open the reader
4. **Scroll**: Scroll down to load more pages automatically
5. **Progress**: Your reading progress is automatically saved and synced

## Development

### Build for production:
```bash
npm run build
```

### Preview production build:
```bash
npm run preview
```

## License

ISC
