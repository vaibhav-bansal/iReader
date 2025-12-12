import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getBook, getProgress, saveProgress } from '../utils/storage'
import { getPreferences, savePreferences } from '../utils/storage'
import ReaderControls from '../components/ReaderControls'
import { useAnalytics, ANALYTICS_EVENTS, ANALYTICS_PROPERTIES } from '../utils/analytics'
import './Reader.css'

function Reader() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rendition, setRendition] = useState(null)
  const [bookInstance, setBookInstance] = useState(null)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [progress, setProgress] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState(getPreferences())
  const readerRef = useRef(null)
  const pdfViewerRef = useRef(null)
  const { track } = useAnalytics()
  const progressUpdateTimeoutRef = useRef(null)

  useEffect(() => {
    loadBook()
    applyTheme()
  }, [bookId])

  useEffect(() => {
    if (rendition && preferences) {
      applyPreferences()
    }
  }, [rendition, preferences])
  
  // Track reading completion when progress reaches 100%
  useEffect(() => {
    if (progress >= 100 && book) {
      track(ANALYTICS_EVENTS.READING_COMPLETED, {
        [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
        [ANALYTICS_PROPERTIES.BOOK_TITLE]: book.title,
        [ANALYTICS_PROPERTIES.BOOK_AUTHOR]: book.author || 'Unknown',
        [ANALYTICS_PROPERTIES.BOOK_FORMAT]: book.format,
      })
    }
  }, [progress, book])
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current)
      }
    }
  }, [])

  const loadBook = async () => {
    try {
      console.log('Loading book with ID:', bookId)
      const bookData = await getBook(bookId)
      if (!bookData) {
        alert('Book not found')
        navigate('/')
        return
      }

      console.log('Book data retrieved:', {
        id: bookData.id,
        title: bookData.title,
        format: bookData.format,
        hasFileData: !!bookData.fileData,
        fileDataType: typeof bookData.fileData,
        fileDataIsArrayBuffer: bookData.fileData instanceof ArrayBuffer,
        fileDataSize: bookData.fileData ? (bookData.fileData.byteLength || bookData.fileData.length) : 0
      })

      // Verify fileData exists and convert if needed
      if (!bookData.fileData) {
        throw new Error('Book file data is missing from storage. Please re-upload the book.')
      }

      // Ensure fileData is an ArrayBuffer (IndexedDB might return it differently)
      if (!(bookData.fileData instanceof ArrayBuffer)) {
        console.warn('fileData is not ArrayBuffer, attempting conversion')
        if (bookData.fileData instanceof Uint8Array) {
          bookData.fileData = bookData.fileData.buffer
        } else if (bookData.fileData instanceof Blob) {
          // Convert Blob to ArrayBuffer
          bookData.fileData = await bookData.fileData.arrayBuffer()
        } else if (typeof bookData.fileData === 'string') {
          // If it's a base64 string, decode it
          const binaryString = atob(bookData.fileData)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          bookData.fileData = bytes.buffer
        } else {
          throw new Error('Invalid file data format in storage')
        }
      }

      setBook(bookData)
      
      // Load saved progress
      const savedProgress = await getProgress(bookId)
      if (savedProgress) {
        setProgress(savedProgress.percentage)
      }

      // Track reading started
      track(ANALYTICS_EVENTS.READING_STARTED, {
        [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
        [ANALYTICS_PROPERTIES.BOOK_TITLE]: bookData.title,
        [ANALYTICS_PROPERTIES.BOOK_AUTHOR]: bookData.author || 'Unknown',
        [ANALYTICS_PROPERTIES.BOOK_FORMAT]: bookData.format,
        [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: savedProgress?.percentage || 0,
        resumed: savedProgress ? true : false,
      })

      // Render based on format
      if (bookData.format === 'epub') {
        console.log('Starting EPUB load...')
        await loadEPUB(bookData, savedProgress)
        console.log('EPUB load completed')
      } else if (bookData.format === 'pdf') {
        console.log('Starting PDF load...')
        await loadPDF(bookData, savedProgress)
        console.log('PDF load completed')
      } else {
        throw new Error(`Unsupported book format: ${bookData.format}`)
      }
    } catch (error) {
      console.error('Error loading book:', error)
      alert(`Error loading book: ${error.message}\n\nPlease check the browser console for more details.`)
      setLoading(false)
      // Don't navigate away immediately, let user see the error
      setTimeout(() => {
        navigate('/')
      }, 3000)
    } finally {
      setLoading(false)
    }
  }

  const loadEPUB = async (bookData, savedProgress) => {
    try {
      console.log('Loading EPUB, fileData type:', typeof bookData.fileData, 'is ArrayBuffer:', bookData.fileData instanceof ArrayBuffer)
      
      // Check if fileData exists
      if (!bookData.fileData) {
        throw new Error('Book file data is missing')
      }

      // If fileData is not an ArrayBuffer, try to convert it
      let fileData = bookData.fileData
      if (!(fileData instanceof ArrayBuffer)) {
        console.warn('fileData is not ArrayBuffer, attempting conversion')
        if (fileData instanceof Uint8Array) {
          fileData = fileData.buffer
        } else {
          throw new Error('Invalid file data format')
        }
      }

      const EPUB = (await import('epubjs')).default
      
      // Create book with timeout
      const bookPromise = new Promise((resolve, reject) => {
        try {
          const book = EPUB(fileData)
          
          // Set timeout for book.ready
          const timeout = setTimeout(() => {
            reject(new Error('EPUB loading timeout: book.ready did not resolve within 30 seconds'))
          }, 30000)
          
          book.ready.then(() => {
            clearTimeout(timeout)
            resolve(book)
          }).catch((err) => {
            clearTimeout(timeout)
            reject(err)
          })
        } catch (err) {
          reject(err)
        }
      })
      
      const book = await bookPromise
      console.log('EPUB book loaded successfully')

      // Ensure reader container is ready
      if (!readerRef.current) {
        throw new Error('Reader container not available')
      }

      const renditionInstance = book.renderTo(readerRef.current, {
        width: '100%',
        height: '100%',
        spread: 'none'
      })

      // Set timeout for display
      const displayPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('EPUB display timeout: rendition.display did not resolve within 30 seconds'))
        }, 30000)
        
        renditionInstance.display()
          .then(() => {
            clearTimeout(timeout)
            resolve()
          })
          .catch((err) => {
            clearTimeout(timeout)
            reject(err)
          })
      })

      await displayPromise
      console.log('EPUB rendered successfully')
      
      setRendition(renditionInstance)
      setBookInstance(book)

      // Resume from saved position
      if (savedProgress && savedProgress.position) {
        try {
          await renditionInstance.display(savedProgress.position)
        } catch (e) {
          console.warn('Could not resume from saved position', e)
        }
      }

      // Track location changes
      renditionInstance.on('relocated', (location) => {
        setCurrentLocation(location)
        updateProgress(book, location)
      })

      applyPreferences()
    } catch (error) {
      console.error('Error loading EPUB:', error)
      alert(`Error loading EPUB: ${error.message}. Please check the browser console for details.`)
      throw error
    }
  }

  const loadPDF = async (bookData, savedProgress) => {
    try {
      const pdfjsLib = await import('pdfjs-dist')
      // Use CDN for worker in development, or copy worker to public in production
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

      const loadingTask = pdfjsLib.getDocument({ data: bookData.fileData })
      const pdf = await loadingTask.promise

      const container = readerRef.current
      container.innerHTML = ''

      let startPage = 1
      if (savedProgress && savedProgress.position) {
        startPage = parseInt(savedProgress.position) || 1
      }

      // Render first page
      await renderPDFPage(pdf, startPage, container)

      // Track page changes for progress
      let currentPageRef = startPage
      const updatePDFProgress = () => {
        const currentPage = currentPageRef
        const percentage = (currentPage / pdf.numPages) * 100
        setProgress(percentage)
        saveProgress(bookId, currentPage.toString(), percentage)
        
        // Debounce progress tracking
        if (progressUpdateTimeoutRef.current) {
          clearTimeout(progressUpdateTimeoutRef.current)
        }
        
        progressUpdateTimeoutRef.current = setTimeout(() => {
          track(ANALYTICS_EVENTS.READING_PROGRESS_UPDATED, {
            [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
            [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: percentage,
            [ANALYTICS_PROPERTIES.READING_POSITION]: currentPage.toString(),
            page_number: currentPage,
          })
        }, 2000)
      }

      // Store PDF instance for navigation
      const pdfInstance = { 
        pdf, 
        currentPage: startPage, 
        totalPages: pdf.numPages, 
        updateProgress: updatePDFProgress,
        setCurrentPage: (page) => { currentPageRef = page }
      }
      setBookInstance(pdfInstance)
      
      // Track initial PDF progress
      updatePDFProgress()
      
      // Track initial PDF progress
      updatePDFProgress()
    } catch (error) {
      console.error('Error loading PDF:', error)
      throw error
    }
  }

  const renderPDFPage = async (pdf, pageNum, container) => {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 2.0 })
    
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.height = viewport.height
    canvas.width = viewport.width
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise

    container.innerHTML = ''
    container.appendChild(canvas)
  }

  const updateProgress = async (book, location) => {
    if (!book || !location) return

    try {
      const totalLocations = book.locations.total
      const currentLocation = location.start.cfi
      const percentage = totalLocations > 0 
        ? (location.start.percentage * 100) 
        : 0

      setProgress(percentage)
      await saveProgress(bookId, currentLocation, percentage)
      
      // Debounce progress tracking to avoid too many events
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current)
      }
      
      progressUpdateTimeoutRef.current = setTimeout(() => {
        track(ANALYTICS_EVENTS.READING_PROGRESS_UPDATED, {
          [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
          [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: percentage,
          [ANALYTICS_PROPERTIES.READING_POSITION]: currentLocation,
        })
      }, 2000) // Track every 2 seconds max
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }

  const applyTheme = () => {
    document.documentElement.setAttribute('data-theme', preferences.theme)
  }

  const applyPreferences = () => {
    if (!rendition) return

    const theme = {
      body: {
        'font-family': preferences.fontFamily === 'serif' 
          ? 'Georgia, serif' 
          : preferences.fontFamily === 'sans-serif'
          ? 'system-ui, sans-serif'
          : 'monospace',
        'font-size': `${preferences.fontSize}px`,
        'line-height': `${preferences.lineSpacing}`,
        'padding': preferences.pageWidth === 'narrow' 
          ? '0 20%' 
          : preferences.pageWidth === 'wide'
          ? '0 5%'
          : '0 15%'
      }
    }

    rendition.themes.default(theme)
    rendition.themes.fontSize(`${preferences.fontSize}px`)
  }

  const handleNext = () => {
    if (rendition) {
      rendition.next()
      track(ANALYTICS_EVENTS.PAGE_NAVIGATED, {
        [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
        [ANALYTICS_PROPERTIES.NAVIGATION_DIRECTION]: 'next',
        [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: progress,
      })
    } else if (bookInstance && bookInstance.pdf) {
      // PDF navigation
      const nextPage = Math.min(bookInstance.currentPage + 1, bookInstance.totalPages)
      renderPDFPage(bookInstance.pdf, nextPage, readerRef.current)
      bookInstance.currentPage = nextPage
      if (bookInstance.setCurrentPage) {
        bookInstance.setCurrentPage(nextPage)
      }
      const percentage = (nextPage / bookInstance.totalPages) * 100
      setProgress(percentage)
      saveProgress(bookId, nextPage.toString(), percentage)
      
      track(ANALYTICS_EVENTS.PAGE_NAVIGATED, {
        [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
        [ANALYTICS_PROPERTIES.NAVIGATION_DIRECTION]: 'next',
        [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: percentage,
        page_number: nextPage,
      })
    }
  }

  const handlePrevious = () => {
    if (rendition) {
      rendition.prev()
      track(ANALYTICS_EVENTS.PAGE_NAVIGATED, {
        [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
        [ANALYTICS_PROPERTIES.NAVIGATION_DIRECTION]: 'previous',
        [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: progress,
      })
    } else if (bookInstance && bookInstance.pdf) {
      // PDF navigation
      const prevPage = Math.max(bookInstance.currentPage - 1, 1)
      renderPDFPage(bookInstance.pdf, prevPage, readerRef.current)
      bookInstance.currentPage = prevPage
      if (bookInstance.setCurrentPage) {
        bookInstance.setCurrentPage(prevPage)
      }
      const percentage = (prevPage / bookInstance.totalPages) * 100
      setProgress(percentage)
      saveProgress(bookId, prevPage.toString(), percentage)
      
      track(ANALYTICS_EVENTS.PAGE_NAVIGATED, {
        [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
        [ANALYTICS_PROPERTIES.NAVIGATION_DIRECTION]: 'previous',
        [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: percentage,
        page_number: prevPage,
      })
    }
  }

  const handlePreferencesChange = (newPrefs) => {
    const updated = { ...preferences, ...newPrefs }
    setPreferences(updated)
    savePreferences(updated)
    applyTheme()
    
    // Track preference changes
    Object.keys(newPrefs).forEach(key => {
      const value = newPrefs[key]
      switch (key) {
        case 'theme':
          track(ANALYTICS_EVENTS.THEME_CHANGED, {
            [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
            [ANALYTICS_PROPERTIES.THEME]: value,
          })
          break
        case 'fontSize':
          track(ANALYTICS_EVENTS.FONT_SIZE_CHANGED, {
            [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
            [ANALYTICS_PROPERTIES.FONT_SIZE]: value,
          })
          break
        case 'lineSpacing':
          track(ANALYTICS_EVENTS.LINE_SPACING_CHANGED, {
            [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
            [ANALYTICS_PROPERTIES.LINE_SPACING]: value,
          })
          break
        case 'pageWidth':
          track(ANALYTICS_EVENTS.PAGE_WIDTH_CHANGED, {
            [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
            [ANALYTICS_PROPERTIES.PAGE_WIDTH]: value,
          })
          break
        case 'fontFamily':
          track(ANALYTICS_EVENTS.FONT_FAMILY_CHANGED, {
            [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
            [ANALYTICS_PROPERTIES.FONT_FAMILY]: value,
          })
          break
      }
    })
  }

  const toggleControls = () => {
    setShowControls(!showControls)
  }

  if (loading) {
    return (
      <div className="reader-container">
        <div className="loading">Loading book...</div>
      </div>
    )
  }

  if (!book) {
    return null
  }

  return (
    <div className="reader-container" onClick={toggleControls}>
      {showControls && (
        <div className="reader-header" onClick={(e) => e.stopPropagation()}>
          <button className="back-button" onClick={() => {
            track(ANALYTICS_EVENTS.NAVIGATION_BACK_TO_LIBRARY, {
              [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
              [ANALYTICS_PROPERTIES.PROGRESS_PERCENTAGE]: progress,
            })
            navigate('/')
          }}>
            ← Library
          </button>
          <div className="reader-title">
            <h2>{book.title}</h2>
            <p>{book.author}</p>
          </div>
          <div className="reader-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
          <button
            className="settings-button"
            onClick={(e) => {
              e.stopPropagation()
              if (!showSettings) {
                track(ANALYTICS_EVENTS.SETTINGS_OPENED, {
                  [ANALYTICS_PROPERTIES.BOOK_ID]: bookId,
                })
              }
              setShowSettings(!showSettings)
            }}
          >
            ⚙️
          </button>
        </div>
      )}

      {showSettings && (
        <ReaderControls
          preferences={preferences}
          onPreferencesChange={handlePreferencesChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div className="reader-content" ref={readerRef} onClick={(e) => e.stopPropagation()} />

      {showControls && (
        <div className="reader-footer" onClick={(e) => e.stopPropagation()}>
          <button className="nav-button" onClick={handlePrevious}>
            ← Previous
          </button>
          <button className="nav-button" onClick={handleNext}>
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

export default Reader

