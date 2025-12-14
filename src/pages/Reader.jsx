import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Document, Page, pdfjs } from 'react-pdf'
import InfiniteScroll from 'react-infinite-scroll-component'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useProgressStore } from '../store/progressStore'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString()

function Reader() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [numPages, setNumPages] = useState(null)
  const [loadedPages, setLoadedPages] = useState(1)
  const [scale, setScale] = useState(1.5)

  const { progress, setProgress } = useProgressStore()

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
    retry: 2,
  })

  useEffect(() => {
    if (bookError) {
      toast.error(bookError.message || 'Failed to load book')
    }
  }, [bookError])

  // Get PDF URL from Supabase Storage
  const { data: pdfUrl, error: pdfUrlError } = useQuery({
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
    if (pdfUrlError) {
      toast.error('Failed to load PDF file')
    }
  }, [pdfUrlError])

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
    toast.error('Failed to load PDF document')
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

  if (bookLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading book...</div>
      </div>
    )
  }

  if (!book || !pdfUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Book not found</div>
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
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Library
          </button>
          <h1 className="text-lg font-semibold truncate flex-1 mx-4">{book.title}</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setScale(prev => Math.max(0.5, prev - 0.25))}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              −
            </button>
            <span className="text-sm">{(scale * 100).toFixed(0)}%</span>
            <button
              onClick={() => setScale(prev => Math.min(3, prev + 0.25))}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
