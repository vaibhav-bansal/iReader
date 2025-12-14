# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in project details (name, database password, region)
4. Wait for project to be created

## 2. Enable Google OAuth

1. Go to Authentication → Providers in your Supabase dashboard
2. Enable Google provider
3. Add your Google OAuth credentials:
   - Client ID (from Google Cloud Console)
   - Client Secret (from Google Cloud Console)
4. **Important**: The redirect URL is automatically configured by Supabase. Make sure your app's URL is added to the **Site URL** in Project Settings → Authentication → URL Configuration
5. For local development, add `http://localhost:5173` to the Site URL
6. For production, add your Vercel deployment URL to the Site URL

## 3. Create Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Click "New bucket"
3. Name it: `books`
4. Make it **private** (not public)
5. Create the bucket

### Storage Policies (RLS)

After creating the bucket, go to Storage → Policies and create these policies:

**Policy 1: Users can upload their own files**
- Policy name: "Users can upload their own files"
- Allowed operation: INSERT
- Policy definition:
```sql
bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]
```

**Policy 2: Users can view their own files**
- Policy name: "Users can view their own files"
- Allowed operation: SELECT
- Policy definition:
```sql
bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]
```

**Policy 3: Users can delete their own files**
- Policy name: "Users can delete their own files"
- Allowed operation: DELETE
- Policy definition:
```sql
bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]
```

## 4. Run Database Schema

1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of `schema.sql`
3. Paste and run it in the SQL Editor
4. Verify tables were created: Go to Table Editor, you should see `books` and `reading_progress`

## 5. Get Environment Variables

1. Go to Project Settings → API
2. Copy the following:
   - **Project URL** → This is your `VITE_SUPABASE_URL`
   - **Publishable key** → This is your `VITE_SUPABASE_PUBLISHABLE_KEY`
     - Format: `sb_publishable_...`
3. Create a `.env` file in your project root:
```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
```

**Note**: This app uses Supabase's new publishable keys. Get your publishable key from the Supabase Dashboard.

## 6. Configure Google OAuth in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Go to APIs & Services → Credentials
4. Click "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add **Authorized JavaScript origins** (your app's URLs):
   - `http://localhost:5173` (for local development)
   - `https://your-vercel-app.vercel.app` (for production)
7. Add **Authorized redirect URIs** (Supabase callback URLs):
   - Get the callback URL from Supabase Dashboard → Authentication → Providers → Google
   - It should be: `https://your-project-ref.supabase.co/auth/v1/callback`
   - Add this exact URL to Google Cloud Console
8. Copy the Client ID and Client Secret to Supabase Auth settings (Authentication → Providers → Google)

## Testing

After setup, you can test:
1. Run `npm run dev`
2. Try signing in with Google
3. Upload a PDF file
4. Open the PDF and scroll to test progress tracking
