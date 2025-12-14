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
  // Initialize currentPage from readingProgress if available, otherwise default to 1
  const [currentPage, setCurrentPage] = useState(() => {
    // This will be set properly when readingProgress loads
    return 1
  })
  const [scale, setScale] = useState(1.5)
  const [isCalculatingZoom, setIsCalculatingZoom] = useState(true)
  const [showPageJumpModal, setShowPageJumpModal] = useState(false)
  const [pageJumpInput, setPageJumpInput] = useState('')
  const pageHeightRef = useRef(null)
  const lastSavedPageRef = useRef(null)
  const touchStartRef = useRef({ x: 0, y: 0 })
  const touchEndRef = useRef({ x: 0, y: 0 })

  const { setProgress } = useProgressStore()

  // Navigation functions
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const goToFirstPage = () => {
    setCurrentPage(1)
  }

  const goToLastPage = () => {
    if (numPages) {
      setCurrentPage(numPages)
    }
  }

  const handlePageJump = () => {
    const pageNum = parseInt(pageJumpInput, 10)
    if (pageNum && pageNum >= 1 && pageNum <= numPages) {
      setCurrentPage(pageNum)
      setShowPageJumpModal(false)
      setPageJumpInput('')
    } else {
      toast.error(`Please enter a page number between 1 and ${numPages}`)
    }
  }

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
    staleTime: 0, // Always refetch to get latest progress
    cacheTime: 0, // Don't cache, always get fresh data
  })

  // Restore saved zoom level when reading progress loads
  useEffect(() => {
    if (readingProgress?.zoom_level && isCalculatingZoom) {
      setScale(readingProgress.zoom_level)
      setIsCalculatingZoom(false)
    }
  }, [readingProgress?.zoom_level, isCalculatingZoom])

  // Restore page when readingProgress loads (before document loads)
  useEffect(() => {
    if (readingProgress?.current_page && !hasRestoredRef.current && !numPages) {
      // Document hasn't loaded yet, but we have progress - set it as initial page
      // Will be validated when document loads
      setCurrentPage(readingProgress.current_page)
    }
  }, [readingProgress?.current_page, numPages])

  // Sync progress mutation
  const syncProgressMutation = useMutation({
    mutationFn: async ({ page, zoomLevel }) => {
      // Check authentication and session
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (authError) {
        console.error('Auth error:', authError)
        throw new Error('Authentication error: ' + authError.message)
      }
      if (!user) {
        console.error('No user found')
        throw new Error('Not authenticated')
      }
      if (!session) {
        console.error('No active session')
        throw new Error('No active session - user may need to re-authenticate')
      }

      const progressData = {
        user_id: user.id,
        book_id: bookId,
        current_page: page,
        last_read_at: new Date().toISOString(),
        ...(zoomLevel !== undefined && { zoom_level: zoomLevel }),
      }

      // Use upsert with conflict resolution
      // Supabase uses the unique constraint (user_id, book_id) for conflict resolution
      const { data, error } = await supabase
        .from('reading_progress')
        .upsert(progressData, {
          onConflict: 'user_id,book_id',
        })
        .select()

      if (error) {
        console.error('Database upsert error:', error)
        
        // If upsert fails, try update as fallback
        const { data: updateData, error: updateError } = await supabase
          .from('reading_progress')
          .update({
            current_page: page,
            last_read_at: new Date().toISOString(),
            ...(zoomLevel !== undefined && { zoom_level: zoomLevel }),
          })
          .eq('user_id', user.id)
          .eq('book_id', bookId)
          .select()

        if (updateError) {
          console.error('Update error:', updateError)
          throw updateError
        }
        return updateData
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingProgress', bookId] })
      queryClient.invalidateQueries({ queryKey: ['books'] }) // Also invalidate books to refresh library
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

  const hasRestoredRef = useRef(false)
  const progressSyncTimeoutRef = useRef(null)
  const pendingSaveRef = useRef(null) // Track pending save to prevent duplicate saves

  // Reset restoration ref when bookId changes
  useEffect(() => {
    hasRestoredRef.current = false
    lastSavedPageRef.current = null // Reset saved page ref
    pendingSaveRef.current = null // Reset pending save ref
    setCurrentPage(1) // Reset to page 1, will be restored if progress exists
  }, [bookId])

  const onDocumentLoadSuccess = ({ numPages: totalPages }) => {
    setNumPages(totalPages)
    updateTotalPagesMutation.mutate(totalPages)
    
    // Restore reading position if available (only once)
    if (readingProgress?.current_page && !hasRestoredRef.current) {
      const targetPage = Math.min(Math.max(1, readingProgress.current_page), totalPages)
      setCurrentPage(targetPage)
      // Don't set lastSavedPageRef here - let the save useEffect handle it after restoration
      hasRestoredRef.current = true
    } else if (!readingProgress?.current_page && !hasRestoredRef.current) {
      // No saved progress, start at page 1
      hasRestoredRef.current = true
      // Set lastSavedPageRef to 1 so we don't try to save page 1 on initial load
      lastSavedPageRef.current = 1
    }
  }

  // Handle restoration when readingProgress loads after document
  // Only restore once when both numPages and readingProgress are available
  useEffect(() => {
    if (numPages && readingProgress?.current_page && !hasRestoredRef.current) {
      const targetPage = Math.min(Math.max(1, readingProgress.current_page), numPages)
      setCurrentPage(targetPage)
      // Don't set lastSavedPageRef here - let the save useEffect handle it after restoration
      hasRestoredRef.current = true
    } else if (numPages && !readingProgress?.current_page && !hasRestoredRef.current) {
      // No saved progress, ensure we're on page 1
      setCurrentPage(1)
      lastSavedPageRef.current = 1 // Set to 1 so we don't try to save on initial load
      hasRestoredRef.current = true
    }
  }, [numPages, readingProgress?.current_page])

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          if (currentPage > 1) {
            setCurrentPage(prev => prev - 1)
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (currentPage < numPages) {
            setCurrentPage(prev => prev + 1)
          }
          break
        case ' ':
          e.preventDefault()
          if (currentPage < numPages) {
            setCurrentPage(prev => prev + 1)
          }
          break
        case 'Home':
          e.preventDefault()
          setCurrentPage(1)
          break
        case 'End':
          e.preventDefault()
          if (numPages) {
            setCurrentPage(numPages)
          }
          break
        case 'g':
        case 'G':
          // Go to page (g key)
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            setShowPageJumpModal(true)
          }
          break
        default:
          // Number keys for quick page jump
          if (e.key >= '0' && e.key <= '9' && !e.ctrlKey && !e.metaKey) {
            if (showPageJumpModal) {
              // If modal is open, append to input
              setPageJumpInput(prev => prev + e.key)
            } else {
              // Quick jump: open modal with the digit
              setPageJumpInput(e.key)
              setShowPageJumpModal(true)
            }
          }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, numPages, showPageJumpModal])

  // Touch/swipe gestures
  useEffect(() => {
    const handleTouchStart = (e) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      }
    }

    const handleTouchEnd = (e) => {
      touchEndRef.current = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      }
      
      const deltaX = touchEndRef.current.x - touchStartRef.current.x
      const deltaY = touchEndRef.current.y - touchStartRef.current.y
      const minSwipeDistance = 50

      // Horizontal swipe (left/right)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0 && currentPage > 1) {
          // Swipe right = previous page
          setCurrentPage(prev => prev - 1)
        } else if (deltaX < 0 && currentPage < numPages) {
          // Swipe left = next page
          setCurrentPage(prev => prev + 1)
        }
      }
      // Vertical swipe (up/down)
      else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0 && currentPage > 1) {
          // Swipe down = previous page
          setCurrentPage(prev => prev - 1)
        } else if (deltaY < 0 && currentPage < numPages) {
          // Swipe up = next page
          setCurrentPage(prev => prev + 1)
        }
      }
    }

    const container = document.querySelector('.min-h-screen')
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true })
      container.addEventListener('touchend', handleTouchEnd, { passive: true })
      return () => {
        container.removeEventListener('touchstart', handleTouchStart)
        container.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [currentPage, numPages])

  // Save progress when page changes
  useEffect(() => {
    // Only save if page actually changed and we have valid data
    // Skip if we're still restoring (hasRestoredRef is false means restoration hasn't completed)
    // Also skip if we already have a pending save for this page
    const shouldSave = currentPage && 
                      numPages && 
                      currentPage !== lastSavedPageRef.current && 
                      currentPage !== pendingSaveRef.current &&
                      hasRestoredRef.current
    
    if (shouldSave) {
      // Mark this page as pending save
      pendingSaveRef.current = currentPage
      
      // Update local state immediately
      setProgress(bookId, currentPage)
      
      // Clear any pending timeout
      if (progressSyncTimeoutRef.current) {
        clearTimeout(progressSyncTimeoutRef.current)
        progressSyncTimeoutRef.current = null
      }
      
      // Debounce sync to database - only update lastSavedPageRef AFTER save completes
      progressSyncTimeoutRef.current = setTimeout(() => {
        syncProgressMutation.mutate(
          { page: currentPage, zoomLevel: scale },
          {
            onSuccess: (data) => {
              // Mark as saved after successful save
              lastSavedPageRef.current = currentPage
              pendingSaveRef.current = null
              progressSyncTimeoutRef.current = null
            },
            onError: (error) => {
              console.error('Failed to save progress:', error)
              toast.error('Failed to save reading progress')
              // Clear pending save on error, so it will retry on next change
              pendingSaveRef.current = null
              progressSyncTimeoutRef.current = null
            }
          }
        )
      }, 1000)
    }
    
    return () => {
      if (progressSyncTimeoutRef.current) {
        clearTimeout(progressSyncTimeoutRef.current)
        progressSyncTimeoutRef.current = null
      }
    }
  }, [currentPage, numPages, bookId, scale])

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

      {/* Footer with Navigation Controls */}
      <div className="bg-white border-t sticky bottom-0 z-10 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            {/* Previous Button */}
            <button
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium min-w-[100px]"
            >
              ← Previous
            </button>

            {/* Page Info and Jump */}
            <div className="flex items-center gap-3 flex-1 justify-center">
              <button
                onClick={() => setShowPageJumpModal(true)}
                className="text-sm text-gray-700 hover:text-blue-600 font-medium px-3 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                Page {currentPage} of {numPages || '...'}
                {numPages && (
                  <span className="ml-2 text-gray-500">
                    ({Math.round((currentPage / numPages) * 100)}%)
                  </span>
                )}
              </button>
            </div>

            {/* Next Button */}
            <button
              onClick={goToNextPage}
              disabled={!numPages || currentPage >= numPages}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium min-w-[100px]"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Page Jump Modal */}
      {showPageJumpModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => {
              setShowPageJumpModal(false)
              setPageJumpInput('')
            }}
          />
          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div
              className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Go to Page</h3>
              <div className="mb-4">
                <input
                  type="number"
                  min="1"
                  max={numPages || 1}
                  value={pageJumpInput}
                  onChange={(e) => setPageJumpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePageJump()
                    } else if (e.key === 'Escape') {
                      setShowPageJumpModal(false)
                      setPageJumpInput('')
                    }
                  }}
                  placeholder={`Enter page (1-${numPages || '...'})`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  autoFocus
                />
                {numPages && (
                  <p className="text-sm text-gray-500 mt-2">
                    Total pages: {numPages}
                  </p>
                )}
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowPageJumpModal(false)
                    setPageJumpInput('')
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePageJump}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Reader
