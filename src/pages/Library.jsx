import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

function Library() {
  const navigate = useNavigate()
  const [uploading, setUploading] = useState(false)

  const { data: books, isLoading, error: booksError, refetch } = useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    retry: 2,
  })

  useEffect(() => {
    if (booksError) {
      toast.error('Failed to load library')
    }
  }, [booksError])

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading library...</div>
      </div>
    )
  }

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books?.map((book) => (
            <div
              key={book.id}
              onClick={() => navigate(`/reader/${book.id}`)}
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2 truncate">{book.title}</h2>
              <p className="text-sm text-gray-500 mb-4">{book.total_pages} pages</p>
              <button className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer">
                Read →
              </button>
            </div>
          ))}
        </div>

        {books?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No books yet. Upload a PDF to get started!
          </div>
        )}
      </div>
    </div>
  )
}

export default Library
