import { vi } from 'vitest'
// beforeEach is available globally with globals: true
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReaderControls from './ReaderControls'

describe('ReaderControls Component', () => {
  const defaultPreferences = {
    theme: 'light',
    fontSize: 16,
    lineSpacing: 1.5,
    pageWidth: 'medium',
    fontFamily: 'serif'
  }

  const mockOnPreferencesChange = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all theme options', () => {
    render(
      <ReaderControls
        preferences={defaultPreferences}
        onPreferencesChange={mockOnPreferencesChange}
        onClose={mockOnClose}
        bookFormat="epub"
      />
    )

    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('Sepia')).toBeInTheDocument()
  })

  it('should highlight active theme', () => {
    render(
      <ReaderControls
        preferences={{ ...defaultPreferences, theme: 'dark' }}
        onPreferencesChange={mockOnPreferencesChange}
        onClose={mockOnClose}
        bookFormat="epub"
      />
    )

    const darkButton = screen.getByText('Dark').closest('button')
    expect(darkButton).toHaveClass('active')
  })

  it('should call onPreferencesChange when theme is changed', async () => {
    const user = userEvent.setup()
    render(
      <ReaderControls
        preferences={defaultPreferences}
        onPreferencesChange={mockOnPreferencesChange}
        onClose={mockOnClose}
        bookFormat="epub"
      />
    )

    const darkButton = screen.getByText('Dark')
    await user.click(darkButton)

    expect(mockOnPreferencesChange).toHaveBeenCalledWith({ theme: 'dark' })
  })

  it('should render font size slider for EPUB', () => {
    render(
      <ReaderControls
        preferences={defaultPreferences}
        onPreferencesChange={mockOnPreferencesChange}
        onClose={mockOnClose}
        bookFormat="epub"
      />
    )

    expect(screen.getByLabelText(/font size/i)).toBeInTheDocument()
    expect(screen.getByText('16px')).toBeInTheDocument()
  })

  it('should not render font size slider for PDF', () => {
    render(
      <ReaderControls
        preferences={defaultPreferences}
        onPreferencesChange={mockOnPreferencesChange}
        onClose={mockOnClose}
        bookFormat="pdf"
      />
    )

    expect(screen.queryByLabelText(/font size/i)).not.toBeInTheDocument()
  })

  it('should update font size when slider is moved', async () => {
    const user = userEvent.setup()
    render(
      <ReaderControls
        preferences={defaultPreferences}
        onPreferencesChange={mockOnPreferencesChange}
        onClose={mockOnClose}
        bookFormat="epub"
      />
    )

    const slider = screen.getByLabelText(/font size/i)
    await user.clear(slider)
    await user.type(slider, '20')

    expect(mockOnPreferencesChange).toHaveBeenCalledWith({ fontSize: 20 })
  })

  it('should render line spacing slider for EPUB', () => {
    render(
      <ReaderControls
        preferences={defaultPreferences}
        onPreferencesChange={mockOnPreferencesChange}
        onClose={mockOnClose}
        bookFormat="epub"
      />
    )

    expect(screen.getByLabelText(/line spacing/i)).toBeInTheDocument()
    expect(screen.getByText('1.5x')).toBeInTheDocument()
  })

  it('should render font family buttons for EPUB', () => {
    render(
      <ReaderControls
        preferences={defaultPreferences}
        onPreferencesChange={mockOnPreferencesChange}
        onClose={mockOnClose}
        bookFormat="epub"
      />
    )

    expect(screen.getByText('Serif')).toBeInTheDocument()
    expect(screen.getByText('Sans')).toBeInTheDocument()
    expect(screen.getByText('Mono')).toBeInTheDocument()
  })

  it('should highlight active font family', () => {
    render(
      <ReaderControls
        preferences={{ ...defaultPreferences, fontFamily: 'sans-serif' }}
        onPreferencesChange={mockOnPreferencesChange}
        onClose={mockOnClose}
        bookFormat="epub"
      />
    )

    const sansButton = screen.getByText('Sans').closest('button')
    expect(sansButton).toHaveClass('active')
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <ReaderControls
        preferences={defaultPreferences}
        onPreferencesChange={mockOnPreferencesChange}
        onClose={mockOnClose}
        bookFormat="epub"
      />
    )

    const closeButton = screen.getByLabelText('Close')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should call onClose when overlay is clicked', async () => {
    const user = userEvent.setup()
    render(
      <ReaderControls
        preferences={defaultPreferences}
        onPreferencesChange={mockOnPreferencesChange}
        onClose={mockOnClose}
        bookFormat="epub"
      />
    )

    const overlay = document.querySelector('.reader-controls-overlay')
    await user.click(overlay)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should not call onClose when panel is clicked', async () => {
    const user = userEvent.setup()
    render(
      <ReaderControls
        preferences={defaultPreferences}
        onPreferencesChange={mockOnPreferencesChange}
        onClose={mockOnClose}
        bookFormat="epub"
      />
    )

    const panel = document.querySelector('.reader-controls-panel')
    await user.click(panel)

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('should show PDF-specific notice for PDF books', () => {
    render(
      <ReaderControls
        preferences={defaultPreferences}
        onPreferencesChange={mockOnPreferencesChange}
        onClose={mockOnClose}
        bookFormat="pdf"
      />
    )

    expect(screen.getByText(/use the pdf toolbar/i)).toBeInTheDocument()
  })
})

