import { vi } from 'vitest'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { PostHogProvider } from 'posthog-js/react'

// Mock PostHog
const mockPostHog = {
  capture: vi.fn(),
  identify: vi.fn(),
  register: vi.fn(),
  reset: vi.fn(),
  flush: vi.fn(),
  isFeatureEnabled: vi.fn(() => false),
  onFeatureFlags: vi.fn(),
  getFeatureFlag: vi.fn(),
}

// Custom render function that includes Router
export const renderWithRouter = (ui, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route)
  return render(
    <PostHogProvider client={mockPostHog}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </PostHogProvider>
  )
}

// Helper to create a mock book
export const createMockBook = (overrides = {}) => ({
  id: 1,
  title: 'Test Book',
  author: 'Test Author',
  format: 'epub',
  source: 'uploaded',
  cover: null,
  fileData: new ArrayBuffer(100),
  addedAt: new Date().toISOString(),
  ...overrides
})

// Helper to create a mock file
export const createMockFile = (name, content, type) => {
  return new File([content], name, { type })
}

export { mockPostHog }

