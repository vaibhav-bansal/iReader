# Supabase API Keys

## Overview

This app uses Supabase's new **publishable keys** for client-side operations. We only support the latest API key format.

## API Keys Used

- **Publishable Key** (`sb_publishable_...`)
  - Safe to expose in frontend code
  - Used for all client-side Supabase operations
  - Environment variable: `VITE_SUPABASE_PUBLISHABLE_KEY`
  - Get it from: Supabase Dashboard → Project Settings → API

## Setup

1. Go to Supabase Dashboard → Project Settings → API
2. Copy the **Publishable key** (starts with `sb_publishable_...`)
3. Add it to your `.env` file:
   ```env
   VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
   ```

## Code Implementation

```javascript
// src/lib/supabase.js
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = createClient(supabaseUrl, supabasePublishableKey)
```

## Benefits of New Keys

1. **Better Security**: Instant revocation, no JWT expiry issues
2. **Zero-Downtime Rotation**: Rotate keys without breaking apps
3. **Audit Logging**: All key usage is logged
4. **Modern Architecture**: Built for modern security practices

## Resources

- [Supabase API Keys Discussion](https://github.com/orgs/supabase/discussions/29260)
- [Supabase API Keys Docs](https://supabase.com/docs/guides/api/api-keys)
