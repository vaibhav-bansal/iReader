import { vi } from 'vitest'
// beforeEach is available globally with globals: true
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithRouter, createMockBook } from './testUtils'
import Library from '../pages/Library'
import Reader from '../pages/Reader'
import * as storage from '../utils/storage'
import * as bookParser from '../utils/bookParser'

// Mock dependencies
vi.mock('../utils/storage')
vi.mock('../utils/bookParser')
vi.mock('../utils/analytics', () => ({
  useAnalytics: () => ({
    track: vi.fn()
  }),
  ANALYTICS_EVENTS: {},
  ANALYTICS_PROPERTIES: {}
}))

// Mock EPUB.js
vi.mock('epubjs', () => ({
  default: vi.fn(() => ({
    ready: Promise.resolve(),
    loaded: {
      metadata: Promise.resolve({
        title: 'Test Book',
        creator: 'Test Author'
      })
    },
    renderTo: vi.fn(() => ({
      on: vi.fn(),
      display: vi.fn(() => Promise.resolve()),
      next: vi.fn(),
      prev: vi.fn(),
      resize: vi.fn(),
      themes: {
        default: vi.fn()
      }
    })),
    locations: {
      generate: vi.fn(() => Promise.resolve()),
      percentageFromCfi: vi.fn(() => 0.5),
      length: vi.fn(() => 0)
    },
    destroy: vi.fn()
  }))
}))

describe('Integration Tests - Complete User Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storage.getAllBooks.mockResolvedValue([])
    storage.getProgress.mockResolvedValue(null)
    storage.getPreferences.mockReturnValue({
      theme: 'light',
      fontSize: 16,
      lineSpacing: 1.5,
      pageWidth: 'medium',
      fontFamily: 'serif'
    })
  })

  describe('Flow 1: Upload Book → Read → Return', () => {
    it('should complete full upload and reading flow', async () => {
      const user = userEvent.setup()
      const mockFile = new File(['test content'], 'test.epub', { type: 'application/epub+zip' })
      const mockBookData = {
        title: 'Test Book',
        author: 'Test Author',
        format: 'epub',
        source: 'uploaded',
        cover: null,
        fileData: new ArrayBuffer(100)
      }
      const mockBook = createMockBook({ id: 1, ...mockBookData })

      // Initial state - empty library
      storage.getAllBooks.mockResolvedValue([])
      const { rerender } = renderWithRouter(<Library />)

      await waitFor(() => {
        expect(screen.getByText('Your library is empty')).toBeInTheDocument()
      })

      // Upload book
      bookParser.parseBookFile.mockResolvedValue(mockBookData)
      storage.addBook.mockResolvedValue(1)
      storage.getAllBooks.mockResolvedValue([mockBook])

      const fileInput = screen.getByLabelText(/upload book/i)
      await user.upload(fileInput, mockFile)

      await waitFor(() => {
        expect(bookParser.parseBookFile).toHaveBeenCalledWith(mockFile)
        expect(storage.addBook).toHaveBeenCalled()
      })

      // Book should appear in library
      rerender(renderWithRouter(<Library />))
      await waitFor(() => {
        expect(screen.getByText('Test Book')).toBeInTheDocument()
      })

      // Navigate to reader
      storage.getBook.mockResolvedValue(mockBook)
      renderWithRouter(<Reader />, { route: '/reader/1' })

      await waitFor(() => {
        expect(screen.getByText('Test Book')).toBeInTheDocument()
      })
    })
  })

  describe('Flow 2: Multiple Books Management', () => {
    it('should handle multiple books independently', async () => {
      const book1 = createMockBook({ id: 1, title: 'Book 1', author: 'Author 1' })
      const book2 = createMockBook({ id: 2, title: 'Book 2', author: 'Author 2' })

      storage.getAllBooks.mockResolvedValue([book1, book2])
      storage.getProgress.mockResolvedValue(null)

      renderWithRouter(<Library />)

      await waitFor(() => {
        expect(screen.getByText('Book 1')).toBeInTheDocument()
        expect(screen.getByText('Book 2')).toBeInTheDocument()
      })

      // Each book should have independent progress
      storage.getProgress
        .mockResolvedValueOnce({ percentage: 25, lastOpened: new Date().toISOString() })
        .mockResolvedValueOnce({ percentage: 50, lastOpened: new Date().toISOString() })

      await waitFor(() => {
        expect(screen.getByText('25% complete')).toBeInTheDocument()
        expect(screen.getByText('50% complete')).toBeInTheDocument()
      })
    })
  })

  describe('Flow 3: Progress Persistence', () => {
    it('should save and restore reading progress', async () => {
      const mockBook = createMockBook({ id: 1, title: 'Test Book' })
      const savedProgress = {
        bookId: 1,
        position: 'cfi(/6/4)',
        percentage: 50,
        lastOpened: new Date().toISOString()
      }

      storage.getBook.mockResolvedValue(mockBook)
      storage.getProgress.mockResolvedValue(savedProgress)
      storage.saveProgress.mockResolvedValue()

      renderWithRouter(<Reader />, { route: '/reader/1' })

      await waitFor(() => {
        expect(storage.getProgress).toHaveBeenCalledWith('1')
      })

      // Progress should be displayed
      await waitFor(() => {
        const progressBar = screen.getByText(/50%|50/)
        expect(progressBar).toBeInTheDocument()
      })
    })
  })

  describe('Flow 4: Preferences Persistence', () => {
    it('should save and restore reading preferences', async () => {
      const user = userEvent.setup()
      const mockBook = createMockBook({ id: 1, title: 'Test Book', format: 'epub' })

      storage.getBook.mockResolvedValue(mockBook)
      storage.getProgress.mockResolvedValue(null)
      storage.savePreferences.mockImplementation((prefs) => {
        localStorage.setItem('ireader-preferences', JSON.stringify(prefs))
      })

      renderWithRouter(<Reader />, { route: '/reader/1' })

      // Open settings
      const settingsButton = screen.getByLabelText('Settings')
      await user.click(settingsButton)

      await waitFor(() => {
        expect(screen.getByText('Reading Settings')).toBeInTheDocument()
      })

      // Change theme
      const darkButton = screen.getByText('Dark')
      await user.click(darkButton)

      await waitFor(() => {
        expect(storage.savePreferences).toHaveBeenCalled()
      })

      // Preferences should persist
      const savedPrefs = JSON.parse(localStorage.getItem('ireader-preferences'))
      expect(savedPrefs.theme).toBe('dark')
    })
  })
})

