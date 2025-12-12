import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getBook, getProgress, saveProgress } from '../utils/storage'
import { getPreferences, savePreferences } from '../utils/storage'
import ReaderControls from '../components/ReaderControls'
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

  useEffect(() => {
    loadBook()
    applyTheme()
  }, [bookId])

  useEffect(() => {
    if (rendition && preferences) {
      applyPreferences()
    }
  }, [rendition, preferences])

  const loadBook = async () => {
    try {
      const bookData = await getBook(bookId)
      if (!bookData) {
        alert('Book not found')
        navigate('/')
        return
      }

      setBook(bookData)
      
      // Load saved progress
      const savedProgress = await getProgress(bookId)
      if (savedProgress) {
        setProgress(savedProgress.percentage)
      }

      // Render based on format
      if (bookData.format === 'epub') {
        await loadEPUB(bookData, savedProgress)
      } else if (bookData.format === 'pdf') {
        await loadPDF(bookData, savedProgress)
      }
    } catch (error) {
      console.error('Error loading book:', error)
      alert('Error loading book')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const loadEPUB = async (bookData, savedProgress) => {
    try {
      const EPUB = (await import('epubjs')).default
      const book = EPUB(bookData.fileData)
      await book.ready

      const renditionInstance = book.renderTo(readerRef.current, {
        width: '100%',
        height: '100%',
        spread: 'none'
      })

      await renditionInstance.display()
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
      const updatePDFProgress = () => {
        const currentPage = startPage
        const percentage = (currentPage / pdf.numPages) * 100
        setProgress(percentage)
        saveProgress(bookId, currentPage.toString(), percentage)
      }

      updatePDFProgress()

      // Store PDF instance for navigation
      setBookInstance({ pdf, currentPage: startPage, totalPages: pdf.numPages, updateProgress: updatePDFProgress })
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
    } else if (bookInstance && bookInstance.pdf) {
      // PDF navigation
      const nextPage = Math.min(bookInstance.currentPage + 1, bookInstance.totalPages)
      renderPDFPage(bookInstance.pdf, nextPage, readerRef.current)
      bookInstance.currentPage = nextPage
      const percentage = (nextPage / bookInstance.totalPages) * 100
      setProgress(percentage)
      saveProgress(bookId, nextPage.toString(), percentage)
    }
  }

  const handlePrevious = () => {
    if (rendition) {
      rendition.prev()
    } else if (bookInstance && bookInstance.pdf) {
      // PDF navigation
      const prevPage = Math.max(bookInstance.currentPage - 1, 1)
      renderPDFPage(bookInstance.pdf, prevPage, readerRef.current)
      bookInstance.currentPage = prevPage
      const percentage = (prevPage / bookInstance.totalPages) * 100
      setProgress(percentage)
      saveProgress(bookId, prevPage.toString(), percentage)
    }
  }

  const handlePreferencesChange = (newPrefs) => {
    const updated = { ...preferences, ...newPrefs }
    setPreferences(updated)
    savePreferences(updated)
    applyTheme()
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
          <button className="back-button" onClick={() => navigate('/')}>
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

