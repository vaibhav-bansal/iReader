import { vi } from 'vitest'
// beforeEach is available globally with globals: true
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithRouter, createMockBook } from '../test/testUtils'
import Library from './Library'
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

describe('Library Component', () => {
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

  it('should render empty library message when no books', async () => {
    renderWithRouter(<Library />)
    
    await waitFor(() => {
      expect(screen.getByText('Your library is empty')).toBeInTheDocument()
      expect(screen.getByText('Upload an EPUB or PDF file to get started')).toBeInTheDocument()
    })
  })

  it('should display books in library', async () => {
    const mockBooks = [
      createMockBook({ id: 1, title: 'Book 1', author: 'Author 1' }),
      createMockBook({ id: 2, title: 'Book 2', author: 'Author 2' })
    ]

    storage.getAllBooks.mockResolvedValue(mockBooks)
    storage.getProgress.mockResolvedValue(null)

    renderWithRouter(<Library />)

    await waitFor(() => {
      expect(screen.getByText('Book 1')).toBeInTheDocument()
      expect(screen.getByText('Book 2')).toBeInTheDocument()
      expect(screen.getByText('Author 1')).toBeInTheDocument()
      expect(screen.getByText('Author 2')).toBeInTheDocument()
    })
  })

  it('should display progress indicator for books with progress', async () => {
    const mockBook = createMockBook({ id: 1, title: 'Book 1' })
    storage.getAllBooks.mockResolvedValue([mockBook])
    storage.getProgress.mockResolvedValue({ percentage: 50, lastOpened: new Date().toISOString() })

    renderWithRouter(<Library />)

    await waitFor(() => {
      expect(screen.getByText('50% complete')).toBeInTheDocument()
    })
  })

  it('should handle file upload via file picker', async () => {
    const user = userEvent.setup()
    const mockFile = new File(['test content'], 'test.epub', { type: 'application/epub+zip' })
    const mockBookData = {
      title: 'Test Book',
      author: 'Test Author',
      format: 'epub',
      source: 'uploaded',
      fileData: new ArrayBuffer(100)
    }

    storage.getAllBooks.mockResolvedValue([])
    bookParser.parseBookFile.mockResolvedValue(mockBookData)
    storage.addBook.mockResolvedValue(1)

    renderWithRouter(<Library />)

    const fileInput = screen.getByLabelText(/upload book/i)
    await user.upload(fileInput, mockFile)

    await waitFor(() => {
      expect(bookParser.parseBookFile).toHaveBeenCalledWith(mockFile)
      expect(storage.addBook).toHaveBeenCalled()
    })
  })

  it('should handle drag and drop file upload', async () => {
    const mockFile = new File(['test content'], 'test.epub', { type: 'application/epub+zip' })
    const mockBookData = {
      title: 'Test Book',
      author: 'Test Author',
      format: 'epub',
      source: 'uploaded',
      fileData: new ArrayBuffer(100)
    }

    storage.getAllBooks.mockResolvedValue([])
    bookParser.parseBookFile.mockResolvedValue(mockBookData)
    storage.addBook.mockResolvedValue(1)

    renderWithRouter(<Library />)

    const uploadArea = screen.getByText(/drag and drop/i).closest('.upload-area')
    
    fireEvent.dragOver(uploadArea, {
      dataTransfer: {
        files: [mockFile]
      }
    })

    fireEvent.drop(uploadArea, {
      dataTransfer: {
        files: [mockFile]
      }
    })

    await waitFor(() => {
      expect(bookParser.parseBookFile).toHaveBeenCalledWith(mockFile)
    })
  })

  it('should reject non-EPUB/PDF files in drag and drop', async () => {
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' })

    storage.getAllBooks.mockResolvedValue([])
    window.alert = vi.fn()

    renderWithRouter(<Library />)

    const uploadArea = screen.getByText(/drag and drop/i).closest('.upload-area')
    
    fireEvent.drop(uploadArea, {
      dataTransfer: {
        files: [mockFile]
      }
    })

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Please upload an EPUB or PDF file')
    })
  })

  it('should delete a book when delete button is clicked', async () => {
    const user = userEvent.setup()
    const mockBook = createMockBook({ id: 1, title: 'Book 1' })
    
    storage.getAllBooks.mockResolvedValue([mockBook])
    storage.getProgress.mockResolvedValue(null)
    storage.deleteBook.mockResolvedValue()
    window.confirm = vi.fn(() => true)

    renderWithRouter(<Library />)

    await waitFor(() => {
      expect(screen.getByText('Book 1')).toBeInTheDocument()
    })

    const deleteButton = screen.getByLabelText('Delete book')
    await user.click(deleteButton)

    await waitFor(() => {
      expect(storage.deleteBook).toHaveBeenCalledWith(1)
    })
  })

  it('should navigate to reader when book is clicked', async () => {
    const user = userEvent.setup()
    const mockBook = createMockBook({ id: 1, title: 'Book 1' })
    
    storage.getAllBooks.mockResolvedValue([mockBook])
    storage.getProgress.mockResolvedValue(null)

    const { container } = renderWithRouter(<Library />)

    await waitFor(() => {
      expect(screen.getByText('Book 1')).toBeInTheDocument()
    })

    const bookCard = screen.getByText('Book 1').closest('.book-card')
    await user.click(bookCard)

    // Check if navigation occurred (URL should change)
    await waitFor(() => {
      expect(window.location.pathname).toBe('/reader/1')
    })
  })

  it('should display format badge on book cards', async () => {
    const epubBook = createMockBook({ id: 1, title: 'EPUB Book', format: 'epub' })
    const pdfBook = createMockBook({ id: 2, title: 'PDF Book', format: 'pdf' })

    storage.getAllBooks.mockResolvedValue([epubBook, pdfBook])
    storage.getProgress.mockResolvedValue(null)

    renderWithRouter(<Library />)

    await waitFor(() => {
      const badges = screen.getAllByText(/EPUB|PDF/)
      expect(badges.some(b => b.textContent === 'EPUB')).toBe(true)
      expect(badges.some(b => b.textContent === 'PDF')).toBe(true)
    })
  })
})

