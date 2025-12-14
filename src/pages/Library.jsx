import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import BookCover from '../components/BookCover'
import BookCoverSkeleton from '../components/BookCoverSkeleton'

function Library() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [hoveredBookId, setHoveredBookId] = useState(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState(null) // { bookId, title }

  const { data: books, isLoading, error: booksError, refetch } = useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      // Fetch books
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (booksError) throw booksError
      if (!booksData || booksData.length === 0) return []

      // Fetch reading progress for all books
      const bookIds = booksData.map(b => b.id)
      const { data: progressData, error: progressError } = await supabase
        .from('reading_progress')
        .select('book_id, current_page, last_read_at, zoom_level')
        .eq('user_id', user.id)
        .in('book_id', bookIds)

      if (progressError) throw progressError
      
      // Create a map of book_id -> progress
      const progressMap = {}
      if (progressData) {
        progressData.forEach(progress => {
          progressMap[progress.book_id] = {
            current_page: progress.current_page,
            last_read_at: progress.last_read_at,
            zoom_level: progress.zoom_level
          }
        })
      }
      
      // Merge books with their progress
      const booksWithProgress = booksData.map(book => ({
        ...book,
        current_page: progressMap[book.id]?.current_page || null,
        last_read_at: progressMap[book.id]?.last_read_at || null,
        zoom_level: progressMap[book.id]?.zoom_level || null
      }))
      
      return booksWithProgress
    },
    retry: 2,
  })

  // Fetch reading progress for all books
  const { data: readingProgressMap, isLoading: readingProgressLoading } = useQuery({
    queryKey: ['readingProgressMap'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !books?.length) return {}

      const bookIds = books.map(b => b.id)
      const { data, error } = await supabase
        .from('reading_progress')
        .select('book_id, last_read_at')
        .eq('user_id', user.id)
        .in('book_id', bookIds)

      if (error) throw error
      
      // Create a map: book_id -> last_read_at
      const map = {}
      data?.forEach(progress => {
        map[progress.book_id] = progress.last_read_at
      })
      return map
    },
    enabled: !!books?.length,
    retry: 2,
  })

  // Generate signed URLs for all book covers
  const { data: pdfUrlMap, isLoading: pdfUrlsLoading } = useQuery({
    queryKey: ['pdfUrls', books],
    queryFn: async () => {
      if (!books?.length) return {}
      
      const urlMap = {}
      await Promise.all(
        books.map(async (book) => {
          if (!book.file_path) return
          
          try {
            // Try to create signed URL (for private buckets)
            const { data, error } = await supabase.storage
              .from('books')
              .createSignedUrl(book.file_path, 3600) // 1 hour expiry
            
            if (error) {
              // Fallback to public URL if signed URL fails
              const publicUrl = supabase.storage
                .from('books')
                .getPublicUrl(book.file_path).data.publicUrl
              urlMap[book.id] = publicUrl
            } else {
              urlMap[book.id] = data.signedUrl
            }
          } catch (error) {
            // Fallback to public URL on error
            const publicUrl = supabase.storage
              .from('books')
              .getPublicUrl(book.file_path).data.publicUrl
            urlMap[book.id] = publicUrl
          }
        })
      )
      return urlMap
    },
    enabled: !!books?.length,
    retry: 2,
  })

  // Delete book mutation
  const deleteBookMutation = useMutation({
    mutationFn: async (bookId) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get book to find file path
      const { data: book } = await supabase
        .from('books')
        .select('file_path')
        .eq('id', bookId)
        .eq('user_id', user.id)
        .single()

      if (!book) throw new Error('Book not found')

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('books')
        .remove([book.file_path])

      if (storageError) throw storageError

      // Delete book record (this will cascade delete reading_progress)
      const { error: dbError } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId)
        .eq('user_id', user.id)

      if (dbError) throw dbError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['readingProgressMap'] })
      queryClient.invalidateQueries({ queryKey: ['pdfUrls'] })
      toast.success('Book deleted successfully')
      setDeleteConfirmation(null)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete book')
    },
  })

  const handleDeleteClick = (e, bookId, bookTitle) => {
    e.stopPropagation() // Prevent navigation
    setDeleteConfirmation({ bookId, title: bookTitle })
  }

  const handleDeleteConfirm = () => {
    if (deleteConfirmation) {
      deleteBookMutation.mutate(deleteConfirmation.bookId)
      setDeleteConfirmation(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmation(null)
  }

  useEffect(() => {
    if (booksError) {
      toast.error('Failed to load library')
    }
  }, [booksError])

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (deleteConfirmation) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [deleteConfirmation])

  const onDrop = async (acceptedFiles) => {
    const pdfFile = acceptedFiles.find(file => file.type === 'application/pdf')
    if (!pdfFile) {
      toast.error('Please upload a PDF file')
      return
    }

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in to upload books')
        return
      }

      // Upload file to Supabase Storage
      const fileExt = pdfFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('books')
        .upload(fileName, pdfFile)

      if (uploadError) throw uploadError

      // Create book record (total_pages will be set when PDF is first opened)
      const { data: bookData, error: dbError } = await supabase
        .from('books')
        .insert({
          user_id: user.id,
          title: pdfFile.name.replace(/\.[^/.]+$/, ''),
          file_name: pdfFile.name,
          file_path: fileName,
          file_size: pdfFile.size,
          total_pages: null, // Will be updated when PDF is first loaded
        })
        .select()
        .single()

      if (dbError) throw dbError

      toast.success('Book uploaded successfully!')
      refetch()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload book')
    } finally {
      setUploading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: uploading,
  })

  // Show skeleton loaders while loading
  const showSkeletons = isLoading || pdfUrlsLoading || readingProgressLoading

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Library</h1>
        
        {/* Upload area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer mb-8 transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="w-full">
              <p>Uploading PDF...</p>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          ) : isDragActive ? (
            <p>Drop the PDF here...</p>
          ) : (
            <p>Drag & drop a PDF here, or click to select</p>
          )}
        </div>

        {/* Books grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {showSkeletons ? (
            // Show skeleton loaders while loading
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="bg-white rounded-lg shadow-md overflow-hidden"
                style={{ aspectRatio: '2/3' }}
              >
                {/* Skeleton Cover */}
                <div className="w-full h-3/4 overflow-hidden">
                  <BookCoverSkeleton className="w-full h-full" />
                </div>
                
                {/* Skeleton Info */}
                <div className="p-3 h-1/4 flex flex-col justify-between bg-white">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="space-y-1.5">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            // Sort books by most recent date (either created_at or last_read_at, whichever is more recent)
            (() => {
              const sortedBooks = [...(books || [])]
              sortedBooks.sort((a, b) => {
                // Get the most recent date for each book
                const aMostRecent = a.last_read_at 
                  ? Math.max(new Date(a.created_at), new Date(a.last_read_at))
                  : new Date(a.created_at)
                
                const bMostRecent = b.last_read_at
                  ? Math.max(new Date(b.created_at), new Date(b.last_read_at))
                  : new Date(b.created_at)
                
                // Sort by most recent date in descending order (newest first)
                return bMostRecent - aMostRecent
              })
              return sortedBooks
            })().map((book) => {
                const pdfUrl = pdfUrlMap?.[book.id] || null
                const lastReadAt = readingProgressMap?.[book.id]
                // Show skeleton for cover if PDF URL is not yet loaded
                const isCoverLoading = !pdfUrl
              
              return (
                <div
                  key={book.id}
                  onMouseEnter={() => setHoveredBookId(book.id)}
                  onMouseLeave={() => setHoveredBookId(null)}
                  className="group relative bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-200"
                  style={{ aspectRatio: '2/3' }}
                  onClick={() => navigate(`/reader/${book.id}`)}
                >
                  {/* Delete button - appears on hover */}
                  {hoveredBookId === book.id && (
                    <button
                      onClick={(e) => handleDeleteClick(e, book.id, book.title)}
                      className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-all duration-200"
                      title="Delete book"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}

                  {/* Book Cover */}
                  <div className="w-full h-3/4 overflow-hidden">
                    {isCoverLoading ? (
                      <BookCoverSkeleton className="w-full h-full" />
                    ) : (
                      <BookCover 
                        pdfUrl={pdfUrl} 
                        title={book.title}
                        className="w-full h-full"
                      />
                    )}
                  </div>

                  {/* Book Info */}
                  <div className="p-3 h-1/4 flex flex-col justify-between bg-white">
                    <h2 className="text-sm font-semibold mb-1 line-clamp-2" title={book.title}>
                      {book.title}
                    </h2>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      {book.total_pages && (
                        <p className="text-gray-500">{book.total_pages} pages</p>
                      )}
                      {lastReadAt ? (
                        <p className="text-gray-400">
                          Last read: {format(new Date(lastReadAt), 'MMM d, yyyy')}
                        </p>
                      ) : book.created_at && (
                        <p className="text-gray-400">
                          Uploaded: {format(new Date(book.created_at), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {books?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No books yet. Upload a PDF to get started!
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation && (
        <>
          {/* Backdrop overlay - darkens and blurs the background */}
          <div 
            className="fixed inset-0 z-40 transition-opacity duration-200"
            onClick={handleDeleteCancel}
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              animation: 'fadeIn 0.2s ease-in-out' 
            }}
            aria-hidden="true"
          />
          
          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div 
              className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 pointer-events-auto transform transition-all duration-200"
              onClick={(e) => e.stopPropagation()}
              style={{ animation: 'fadeInScale 0.2s ease-in-out' }}
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Delete Book</h3>
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete <span className="font-semibold">"{deleteConfirmation.title}"</span>? 
                  This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleDeleteCancel}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleteBookMutation.isPending}
                    className="px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteBookMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Library
