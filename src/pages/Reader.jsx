import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getBook, getProgress, saveProgress, getPreferences, savePreferences } from '../utils/storage'
import ReaderControls from '../components/ReaderControls'
import { useAnalytics, ANALYTICS_EVENTS, ANALYTICS_PROPERTIES } from '../utils/analytics'
import { Worker } from '@react-pdf-viewer/core'
import PDFViewer from '../components/PDFViewer'
import './Reader.css'

// PDF.js worker URL - use local worker
const PDF_WORKER_URL = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString()

function Reader() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const { track } = useAnalytics()
  
  // Core state
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // EPUB state
  const [epubRendition, setEpubRendition] = useState(null)
  const [epubBook, setEpubBook] = useState(null)
  const [epubReady, setEpubReady] = useState(false)
  
  // PDF state
  const [pdfInitialPage, setPdfInitialPage] = useState(0)
  
  // UI state
  const [progress, setProgress] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState(() => getPreferences())
  
  // Refs
  const epubContainerRef = useRef(null)
  const progressTimeoutRef = useRef(null)
  const savedPositionRef = useRef(null)

  // Apply theme on mount and preference changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', preferences.theme)
  }, [preferences.theme])

  // Load book data
  useEffect(() => {
    loadBook()
    return () => {
      // Cleanup EPUB on unmount
      if (epubBook) {
        try {
          epubBook.destroy()
        } catch (e) {
          console.warn('Error destroying epub:', e)
        }
      }
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current)
      }
    }
  }, [bookId])

  // Render EPUB when book and container are ready
  useEffect(() => {
    if (book?.format === 'epub' && epubContainerRef.current && !epubRendition && !epubReady) {
      // Wait for container to have dimensions
      const checkContainer = () => {
        const container = epubContainerRef.current
        if (container) {
          const rect = container.getBoundingClientRect()
          if (rect.width > 0 && rect.height > 0) {
            renderEpub()
          } else {
            // Retry after a short delay if container doesn't have dimensions yet
            setTimeout(checkContainer, 100)
          }
        }
      }
      checkContainer()
    }
  }, [book, epubRendition, epubReady])

  // Apply preferences to EPUB rendition
  useEffect(() => {
    if (epubRendition && epubReady) {
      applyEpubPreferences()
    }
  }, [epubRendition, epubReady, preferences])

  const loadBook = async () => {
    try {
      setLoading(true)
      setError(null)
      setEpubRendition(null)
      setEpubBook(null)
      setEpubReady(false)
      
      const bookData = await getBook(bookId)
      if (!bookData) {
        throw new Error('Book not found')
      }

      // Ensure fileData is ArrayBuffer
      let fileData = bookData.fileData
      if (!fileData) {
        throw new Error('Book file data is missing. Please re-upload the book.')
      }
      
      if (!(fileData instanceof ArrayBuffer)) {
        if (fileData instanceof Uint8Array) {
          fileData = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength)
        } else if (fileData instanceof Blob) {
          fileData = await fileData.arrayBuffer()
        } else {
          throw new Error('Invalid file data format')
        }
        bookData.fileData = fileData
      }

      // Load saved progress
      const savedProgress = await getProgress(bookId)
      if (savedProgress) {
        setProgress(savedProgress.percentage || 0)
        savedPositionRef.current = savedProgress.position
        
        // For PDF, set initial page
        if (bookData.format === 'pdf' && savedProgress.position) {
          const page = parseInt(savedProgress.position) || 0
          setPdfInitialPage(page)
        }
      }

      setBook(bookData)
      
      // Track reading started
      track(ANALYTICS_EVENTS.READING_STARTED, {
        [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
        [ANALYTICS_PROPERTIES.BOOK_TITLE]: bookData.title,
        [ANALYTICS_PROPERTIES.BOOK_FORMAT]: bookData.format,
        resumed: !!savedProgress,
      })

    } catch (err) {
      console.error('Error loading book:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderEpub = async () => {
    if (!book?.fileData || !epubContainerRef.current) {
      console.log('Cannot render EPUB: missing book data or container')
      return
    }

    try {
      console.log('Starting EPUB render...')
      setLoading(true)
      
      // Clear container
      const container = epubContainerRef.current
      container.innerHTML = ''
      
      const EPUB = (await import('epubjs')).default
      
      // Clone the ArrayBuffer to avoid detachment issues
      const clonedData = book.fileData.slice(0)
      
      // Create book instance
      const epubInstance = EPUB(clonedData)
      
      console.log('Waiting for EPUB to be ready...')
      await epubInstance.ready
      console.log('EPUB ready, creating rendition...')
      
      // Get container dimensions - ensure we have valid dimensions
      const rect = container.getBoundingClientRect()
      const width = rect.width > 0 ? rect.width : window.innerWidth
      const height = rect.height > 0 ? rect.height : window.innerHeight - 200
      
      console.log('Container dimensions:', width, height)
      
      // Create rendition with explicit dimensions
      const rendition = epubInstance.renderTo(container, {
        width: width,
        height: height,
        spread: 'none',
        flow: 'paginated',
      })

      // Set up event handlers before display
      rendition.on('relocated', (location) => {
        handleEpubRelocated(location, epubInstance)
      })

      // Display at saved position or start
      const initialLocation = savedPositionRef.current || undefined
      console.log('Displaying at location:', initialLocation || 'start')
      
      await rendition.display(initialLocation)
      console.log('EPUB displayed successfully')

      // Generate locations for progress (do this after display)
      try {
        if (epubInstance.locations && epubInstance.locations.length() === 0) {
          console.log('Generating locations...')
          await epubInstance.locations.generate(1024)
          console.log('Locations generated')
        }
      } catch (locErr) {
        console.warn('Could not generate locations:', locErr)
      }

      // Handle window resize
      const handleResize = () => {
        if (rendition && container) {
          const newRect = container.getBoundingClientRect()
          if (newRect.width > 0 && newRect.height > 0) {
            rendition.resize(newRect.width, newRect.height)
          }
        }
      }
      window.addEventListener('resize', handleResize)
      rendition._resizeHandler = handleResize

      setEpubBook(epubInstance)
      setEpubRendition(rendition)
      setEpubReady(true)
      setLoading(false)
      
    } catch (err) {
      console.error('Error rendering EPUB:', err)
      setError(`Failed to render EPUB: ${err.message}`)
      setLoading(false)
    }
  }

  const handleEpubRelocated = useCallback((location, epubInstance) => {
    if (!location?.start) return

    const cfi = location.start.cfi
    let percentage = 0
    
    if (location.start.percentage !== undefined) {
      percentage = location.start.percentage * 100
    } else if (epubInstance?.locations) {
      try {
        percentage = (epubInstance.locations.percentageFromCfi(cfi) || 0) * 100
      } catch (e) {
        console.warn('Could not calculate percentage:', e)
      }
    }

    setProgress(percentage)
    
    // Debounced save
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current)
    }
    progressTimeoutRef.current = setTimeout(() => {
      saveProgress(bookId, cfi, percentage)
      track(ANALYTICS_EVENTS.READING_PROGRESS_UPDATED, {
        [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
        [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: percentage,
      })
    }, 1000)
  }, [bookId, track])

  const applyEpubPreferences = () => {
    if (!epubRendition) return

    try {
      const fontFamily = preferences.fontFamily === 'serif'
        ? 'Georgia, "Times New Roman", serif'
        : preferences.fontFamily === 'sans-serif'
        ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        : '"Courier New", Courier, monospace'

      // Theme colors based on current theme
      const themeColors = {
        light: { bg: '#ffffff', text: '#1a1a1a' },
        dark: { bg: '#121212', text: '#e0e0e0' },
        sepia: { bg: '#f9f3e3', text: '#5c4b37' },
      }
      const colors = themeColors[preferences.theme] || themeColors.light

      epubRendition.themes.default({
        body: {
          'font-family': fontFamily + ' !important',
          'font-size': `${preferences.fontSize}px !important`,
          'line-height': `${preferences.lineSpacing} !important`,
          'background-color': `${colors.bg} !important`,
          'color': `${colors.text} !important`,
          'padding': '20px !important',
          'margin': '0 !important',
        },
        'p, div, span, h1, h2, h3, h4, h5, h6': {
          'font-family': fontFamily + ' !important',
        }
      })

      // Force re-render
      if (epubContainerRef.current) {
        const rect = epubContainerRef.current.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          epubRendition.resize(rect.width, rect.height)
        }
      }
    } catch (err) {
      console.warn('Error applying preferences:', err)
    }
  }

  // PDF handlers
  const handlePdfPageChange = useCallback((page, total) => {
    const percentage = total > 0 ? ((page + 1) / total) * 100 : 0
    setProgress(percentage)
    
    // Debounced save
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current)
    }
    progressTimeoutRef.current = setTimeout(() => {
      saveProgress(bookId, page.toString(), percentage)
      track(ANALYTICS_EVENTS.READING_PROGRESS_UPDATED, {
        [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
        [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: percentage,
        page_number: page + 1,
      })
    }, 1000)
  }, [bookId, track])

  const handlePdfDocumentLoad = useCallback((numPages) => {
    console.log('PDF loaded with', numPages, 'pages')
  }, [])

  // Navigation
  const handleNext = () => {
    if (epubRendition) {
      epubRendition.next()
      track(ANALYTICS_EVENTS.PAGE_NAVIGATED, {
        [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
        [ANALYTICS_PROPERTIES.NAVIGATION_DIRECTION]: 'next',
      })
    }
  }

  const handlePrevious = () => {
    if (epubRendition) {
      epubRendition.prev()
      track(ANALYTICS_EVENTS.PAGE_NAVIGATED, {
        [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
        [ANALYTICS_PROPERTIES.NAVIGATION_DIRECTION]: 'previous',
      })
    }
  }

  // Settings
  const handlePreferencesChange = (newPrefs) => {
    const updated = { ...preferences, ...newPrefs }
    setPreferences(updated)
    savePreferences(updated)
  }

  const toggleControls = (e) => {
    // Don't toggle when clicking on interactive elements
    if (e.target.closest('button, input, .reader-header, .reader-footer, .pdf-viewer-container')) {
      return
    }
    setShowControls(!showControls)
  }

  const goToLibrary = () => {
    track(ANALYTICS_EVENTS.NAVIGATION_BACK_TO_LIBRARY, {
      [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
      [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: progress,
    })
    navigate('/')
  }

  // Render loading state
  if (loading) {
    return (
      <div className="reader-container">
        <div className="reader-loading">
          <div className="loading-spinner" />
          <p>Loading book...</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="reader-container">
        <div className="reader-error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')}>Back to Library</button>
        </div>
      </div>
    )
  }

  if (!book) return null

  const isPdf = book.format === 'pdf'
  const isEpub = book.format === 'epub'

  return (
    <div className="reader-container" onClick={toggleControls}>
      {/* Header */}
      {showControls && (
        <header className="reader-header" onClick={(e) => e.stopPropagation()}>
          <button className="back-button" onClick={goToLibrary}>
            ← Library
          </button>
          <div className="reader-title">
            <h2>{book.title}</h2>
            {book.author && <p>{book.author}</p>}
          </div>
          <div className="reader-progress-bar">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
          <button
            className="settings-button"
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Settings"
          >
            ⚙️
          </button>
        </header>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <ReaderControls
          preferences={preferences}
          onPreferencesChange={handlePreferencesChange}
          onClose={() => setShowSettings(false)}
          bookFormat={book.format}
        />
      )}

      {/* Main Content */}
      <main className="reader-content">
        {/* EPUB Reader */}
        {isEpub && (
          <div 
            ref={epubContainerRef} 
            className="epub-reader"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* PDF Reader */}
        {isPdf && book.fileData && (
          <div className="pdf-reader" onClick={(e) => e.stopPropagation()}>
            <Worker workerUrl={PDF_WORKER_URL}>
              <PDFViewer
                fileData={book.fileData}
                initialPage={pdfInitialPage}
                onPageChange={handlePdfPageChange}
                onDocumentLoad={handlePdfDocumentLoad}
                theme={preferences.theme}
              />
            </Worker>
          </div>
        )}
      </main>

      {/* Footer - only show for EPUB (PDF has built-in navigation) */}
      {showControls && isEpub && (
        <footer className="reader-footer" onClick={(e) => e.stopPropagation()}>
          <button className="nav-button" onClick={handlePrevious}>
            ← Previous
          </button>
          <button className="nav-button" onClick={handleNext}>
            Next →
          </button>
        </footer>
      )}
    </div>
  )
}

export default Reader
