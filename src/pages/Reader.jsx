import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// Import worker config FIRST - this sets up pdfjs before Document/Page are used
import '../lib/pdfWorker'
import { Document, Page } from 'react-pdf'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useProgressStore } from '../store/progressStore'
import BookLoadingScreen from '../components/BookLoadingScreen'

function Reader() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [numPages, setNumPages] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.5)
  const [isCalculatingZoom, setIsCalculatingZoom] = useState(true)
  const pageHeightRef = useRef(null)
  const lastSavedPageRef = useRef(null)

  const { setProgress } = useProgressStore()

  // Fetch book data
  const { data: book, isLoading: bookLoading, error: bookError } = useQuery({
    queryKey: ['book', bookId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!bookId,
    retry: 2,
  })

  useEffect(() => {
    if (bookError) {
      console.error('Book load error:', bookError)
      toast.error(bookError.message || 'Failed to load book')
    }
  }, [bookError])

  // Get PDF URL from Supabase Storage
  const { data: pdfUrl, error: pdfUrlError, isLoading: pdfUrlLoading } = useQuery({
    queryKey: ['pdfUrl', book?.file_path],
    queryFn: async () => {
      if (!book?.file_path) return null
      
      const { data, error } = await supabase.storage
        .from('books')
        .createSignedUrl(book.file_path, 3600) // 1 hour expiry
      
      if (error) throw error
      return data.signedUrl
    },
    enabled: !!book?.file_path,
    retry: 2,
  })

  useEffect(() => {
    if (pdfUrlError) {
      console.error('PDF URL error:', pdfUrlError)
      toast.error(`Failed to load PDF file: ${pdfUrlError.message || 'Unknown error'}`)
    }
  }, [pdfUrlError])

  // Fetch reading progress
  const { data: readingProgress, isLoading: readingProgressLoading } = useQuery({
    queryKey: ['readingProgress', bookId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
      return data
    },
    enabled: !!bookId,
  })

  // Restore saved zoom level when reading progress loads
  useEffect(() => {
    if (readingProgress?.zoom_level && isCalculatingZoom) {
      setScale(readingProgress.zoom_level)
      setIsCalculatingZoom(false)
    }
  }, [readingProgress?.zoom_level, isCalculatingZoom])

  // Sync progress mutation
  const syncProgressMutation = useMutation({
    mutationFn: async ({ page, zoomLevel }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const progressData = {
        user_id: user.id,
        book_id: bookId,
        current_page: page,
        last_read_at: new Date().toISOString(),
        ...(zoomLevel !== undefined && { zoom_level: zoomLevel }),
      }

      const { error } = await supabase
        .from('reading_progress')
        .upsert(progressData, {
          onConflict: 'user_id,book_id',
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingProgress', bookId] })
    },
    onError: (error) => {
      console.error('Progress sync error:', error)
    },
    retry: 1,
  })

  // Save zoom level mutation (debounced)
  const saveZoomMutation = useMutation({
    mutationFn: async (zoomLevel) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const progressData = {
        user_id: user.id,
        book_id: bookId,
        zoom_level: zoomLevel,
        ...(readingProgress?.current_page && { current_page: readingProgress.current_page }),
        last_read_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('reading_progress')
        .upsert(progressData, {
          onConflict: 'user_id,book_id',
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingProgress', bookId] })
    },
    onError: (error) => {
      console.error('Zoom save error:', error)
    },
    retry: 1,
  })

  // Update total pages in book record when PDF loads
  const updateTotalPagesMutation = useMutation({
    mutationFn: async (totalPages) => {
      if (!book?.total_pages) {
        const { error } = await supabase
          .from('books')
          .update({ total_pages: totalPages })
          .eq('id', bookId)

        if (error) throw error
        queryClient.invalidateQueries({ queryKey: ['book', bookId] })
      }
    },
  })

  const onDocumentLoadSuccess = ({ numPages: totalPages }) => {
    setNumPages(totalPages)
    updateTotalPagesMutation.mutate(totalPages)
    
    // Restore reading position if available
    if (readingProgress?.current_page) {
      const targetPage = Math.min(Math.max(1, readingProgress.current_page), totalPages)
      setCurrentPage(targetPage)
    }
  }

  // Handle restoration when readingProgress loads after document
  useEffect(() => {
    if (numPages && readingProgress?.current_page) {
      const targetPage = Math.min(Math.max(1, readingProgress.current_page), numPages)
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage)
      }
    }
  }, [numPages, readingProgress?.current_page, currentPage])

  // Handle page load success - calculate fit-to-height zoom
  const onPageLoadSuccess = (pageNum) => {
    // Calculate fit-to-height zoom from first page if we don't have a saved zoom
    if (pageNum === 1 && isCalculatingZoom && !readingProgress?.zoom_level) {
      setTimeout(() => {
        try {
          const pageElement = document.getElementById(`page-${pageNum}`)
          if (pageElement) {
            const canvas = pageElement.querySelector('canvas')
            if (canvas) {
              const renderedHeight = canvas.offsetHeight
              const pageHeightAtScale1 = renderedHeight / scale
              pageHeightRef.current = pageHeightAtScale1
              
              const headerHeight = 80
              const padding = 32
              const availableHeight = window.innerHeight - headerHeight - padding
              
              const fitToHeightScale = availableHeight / pageHeightAtScale1
              setScale(fitToHeightScale)
              setIsCalculatingZoom(false)
            }
          }
        } catch (error) {
          console.error('Error calculating fit-to-height zoom:', error)
          setIsCalculatingZoom(false)
        }
      }, 100)
    }
  }

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error)
    toast.error(`Failed to load PDF document: ${error.message || 'Unknown error'}`)
  }

  // Save progress when page changes
  useEffect(() => {
    // Only save if page actually changed and we have valid data
    if (currentPage && numPages && currentPage !== lastSavedPageRef.current) {
      lastSavedPageRef.current = currentPage
      setProgress(bookId, currentPage)
      
      // Debounce sync to database
      clearTimeout(window.progressSyncTimeout)
      window.progressSyncTimeout = setTimeout(() => {
        syncProgressMutation.mutate({ page: currentPage, zoomLevel: scale })
      }, 1000)
    }
    
    return () => {
      clearTimeout(window.progressSyncTimeout)
    }
  }, [currentPage, numPages, bookId, scale, syncProgressMutation])

  // Show loading screen only while fetching initial data
  // Once we have pdfUrl, let Document component handle its own loading
  const showLoadingScreen = 
    bookLoading || 
    pdfUrlLoading || 
    !pdfUrl

  if (showLoadingScreen) {
    return <BookLoadingScreen messageIndex={0} />
  }

  if (bookError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Failed to load book: {bookError.message}</div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Book not found</div>
      </div>
    )
  }

  if (pdfUrlError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Failed to load PDF: {pdfUrlError.message}</div>
      </div>
    )
  }

  if (!pdfUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">PDF file not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
          >
            ← Back to Library
          </button>
          <h1 className="text-lg font-semibold truncate flex-1 mx-4">{book.title}</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const newScale = Math.max(0.5, scale - 0.25)
                setScale(newScale)
                clearTimeout(window.zoomSaveTimeout)
                window.zoomSaveTimeout = setTimeout(() => {
                  saveZoomMutation.mutate(newScale)
                }, 500)
              }}
              className="px-3 py-1 bg-gray-200 rounded-sm hover:bg-gray-300 cursor-pointer"
            >
              −
            </button>
            <span className="text-sm">{(scale * 100).toFixed(0)}%</span>
            <button
              onClick={() => {
                const newScale = Math.min(3, scale + 0.25)
                setScale(newScale)
                clearTimeout(window.zoomSaveTimeout)
                window.zoomSaveTimeout = setTimeout(() => {
                  saveZoomMutation.mutate(newScale)
                }, 500)
              }}
              className="px-3 py-1 bg-gray-200 rounded-sm hover:bg-gray-300 cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* PDF Viewer - Centered Single Page */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div className="max-w-full">
          {pdfUrl && (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="text-center py-12">
                  <div className="text-lg">Loading PDF...</div>
                </div>
              }
              error={
                <div className="text-center py-12 text-red-600">
                  <div className="text-lg mb-2">Failed to load PDF</div>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              }
              className="flex justify-center"
            >
              {numPages && currentPage && (
                <div id={`page-${currentPage}`} className="shadow-lg">
                  <Page
                    pageNumber={currentPage}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    onLoadSuccess={() => onPageLoadSuccess(currentPage)}
                    loading={
                      <div className="text-center py-8">
                        <div className="text-sm text-gray-500">Loading page {currentPage}...</div>
                      </div>
                    }
                    className="max-w-full h-auto"
                  />
                </div>
              )}
            </Document>
          )}
        </div>
      </div>

      {/* Footer with Page Info */}
      <div className="bg-white border-t sticky bottom-0 z-10 p-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {numPages || '...'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reader
