import { useState, useRef, useEffect } from 'react'
import { Document, Page } from 'react-pdf'
import '../lib/pdfWorker'

function BookCover({ pdfUrl, title, className = '' }) {
  const [coverError, setCoverError] = useState(false)
  const [coverLoading, setCoverLoading] = useState(true)
  const [pageWidth, setPageWidth] = useState(200)
  const containerRef = useRef(null)
  
  // Get first letter of title for fallback
  const firstLetter = title?.trim().charAt(0).toUpperCase() || '?'

  // Calculate page width based on container
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        setPageWidth(width)
      }
    }
    
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const handleLoadSuccess = () => {
    setCoverLoading(false)
  }

  const handleLoadError = () => {
    setCoverError(true)
    setCoverLoading(false)
  }

  if (coverError || !pdfUrl) {
    // Fallback: Show first letter in a styled div
    return (
      <div 
        className={`bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-4xl ${className}`}
        style={{ aspectRatio: '2/3' }}
      >
        {firstLetter}
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-gray-100 ${className}`}>
      {coverLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center z-10">
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      )}
      <Document
        file={pdfUrl}
        onLoadSuccess={handleLoadSuccess}
        onLoadError={handleLoadError}
        loading={null}
        className="w-full h-full"
      >
        <div className="w-full h-full flex items-center justify-center">
          <Page
            pageNumber={1}
            width={pageWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="!max-w-full !max-h-full"
          />
        </div>
      </Document>
    </div>
  )
}

export default BookCover

