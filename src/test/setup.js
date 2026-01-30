import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock environment variables
globalThis.import = {
  meta: {
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'test-key',
      VITE_POSTHOG_KEY: 'test-posthog-key',
      VITE_POSTHOG_HOST: 'https://app.posthog.com',
    },
  },
}
