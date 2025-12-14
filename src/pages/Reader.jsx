import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// Import worker config FIRST - this sets up pdfjs before Document/Page are used
import '../lib/pdfWorker'
import { Document, Page } from 'react-pdf'
import InfiniteScroll from 'react-infinite-scroll-component'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useProgressStore } from '../store/progressStore'

function Reader() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [numPages, setNumPages] = useState(null)
  const [loadedPages, setLoadedPages] = useState(1)
  const [scale, setScale] = useState(1.5)

  const { progress, setProgress } = useProgressStore()

  // Debug: Log when component renders
  useEffect(() => {
    console.log('Reader component mounted/rendered, bookId:', bookId)
  }, [bookId])

  // Fetch book data
  const { data: book, isLoading: bookLoading, error: bookError } = useQuery({
    queryKey: ['book', bookId],
    queryFn: async () => {
      console.log('Fetching book data for bookId:', bookId)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      console.log('Book data fetched:', data)
      return data
    },
    enabled: !!bookId, // Only run if bookId exists
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
      
      // For private buckets, create a signed URL
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
    if (pdfUrl) {
      console.log('PDF URL loaded successfully:', pdfUrl)
    }
  }, [pdfUrl])

  useEffect(() => {
    if (pdfUrlError) {
      console.error('PDF URL error:', pdfUrlError)
      console.error('Book file_path:', book?.file_path)
      toast.error(`Failed to load PDF file: ${pdfUrlError.message || 'Unknown error'}`)
    }
  }, [pdfUrlError, book?.file_path])

  // Fetch reading progress
  const { data: readingProgress } = useQuery({
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

  // Sync progress mutation
  const syncProgressMutation = useMutation({
    mutationFn: async ({ page, scrollPosition }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const progressData = {
        user_id: user.id,
        book_id: bookId,
        current_page: page,
        scroll_position: scrollPosition,
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
      console.error('Progress sync error:', error)
      // Don't show toast for progress sync errors - they're not critical
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
    
    // Restore reading position
    if (readingProgress?.current_page) {
      const targetPage = Math.min(readingProgress.current_page, totalPages)
      setLoadedPages(Math.max(targetPage + 2, 3))
      // Scroll to saved position after a short delay
      setTimeout(() => {
        const pageElement = document.getElementById(`page-${targetPage}`)
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 500)
    } else {
      // Load first few pages initially
      setLoadedPages(Math.min(3, totalPages))
    }
  }

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error)
    console.error('PDF URL:', pdfUrl)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    })
    toast.error(`Failed to load PDF document: ${error.message || 'Unknown error'}`)
  }

  const loadMorePages = () => {
    if (loadedPages < numPages) {
      setLoadedPages(prev => Math.min(prev + 2, numPages))
    }
  }

  // Sync progress on scroll (debounced)
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)
      const currentPage = Math.floor(scrollPosition * numPages) + 1
      
      if (numPages && currentPage > 0 && currentPage <= numPages) {
        setProgress(bookId, currentPage, scrollPosition)
        
        // Debounce sync to database
        clearTimeout(window.progressSyncTimeout)
        window.progressSyncTimeout = setTimeout(() => {
          syncProgressMutation.mutate({ page: currentPage, scrollPosition })
        }, 2000)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(window.progressSyncTimeout)
    }
  }, [numPages, bookId, syncProgressMutation, setProgress])

  if (bookLoading || pdfUrlLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading book...</div>
      </div>
    )
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

  const pages = Array.from({ length: loadedPages }, (_, i) => i + 1)

  return (
    <div className="min-h-screen bg-gray-100">
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
              onClick={() => setScale(prev => Math.max(0.5, prev - 0.25))}
              className="px-3 py-1 bg-gray-200 rounded-sm hover:bg-gray-300 cursor-pointer"
            >
              −
            </button>
            <span className="text-sm">{(scale * 100).toFixed(0)}%</span>
            <button
              onClick={() => setScale(prev => Math.min(3, prev + 0.25))}
              className="px-3 py-1 bg-gray-200 rounded-sm hover:bg-gray-300 cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="max-w-4xl mx-auto p-4">
        <InfiniteScroll
          dataLength={pages.length}
          next={loadMorePages}
          hasMore={loadedPages < numPages}
          loader={
            <div className="text-center py-4">
              <div className="text-gray-500">Loading pages...</div>
            </div>
          }
          endMessage={
            <div className="text-center py-4 text-gray-500">
              <p>You've reached the end!</p>
            </div>
          }
        >
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
            className="flex flex-col items-center"
          >
            {pages.map((pageNum) => (
              <div key={pageNum} id={`page-${pageNum}`} className="mb-4">
                <Page
                  pageNumber={pageNum}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-lg"
                />
              </div>
            ))}
          </Document>
        </InfiniteScroll>
      </div>
    </div>
  )
}

export default Reader
