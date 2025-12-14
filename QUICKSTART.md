# Quick Start Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Supabase

### A. Create Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and publishable key

### B. Run Database Schema
1. Open Supabase SQL Editor
2. Copy and paste contents of `supabase/schema.sql`
3. Run the SQL

### C. Create Storage Bucket
1. Go to Storage → Create new bucket
2. Name: `books`
3. Make it **private**
4. Create storage policies (see `supabase/README.md`)

### D. Enable Google OAuth
1. Go to Authentication → Providers
2. Enable Google provider
3. Add your Google OAuth credentials
4. See `supabase/README.md` for detailed instructions

## 3. Configure Environment

Create `.env` file in project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
```

**Note**: Get your publishable key (format: `sb_publishable_...`) from Supabase Dashboard → Project Settings → API.

## 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 5. Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Deploy!

## Troubleshooting

### PDF not loading?
- Check that Storage bucket exists and is named `books`
- Verify Storage policies allow authenticated users to read their files
- Check browser console for errors

### Sign-in not working?
- Verify Google OAuth is enabled in Supabase
- Check redirect URLs are configured correctly
- Ensure Google Cloud Console OAuth credentials are correct

### Upload failing?
- Check Storage bucket exists
- Verify RLS policies allow INSERT operations
- Check file size limits (Supabase free tier: 50MB per file)
