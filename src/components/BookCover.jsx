import { useState } from 'react'

function BookCover({ coverUrl, title, className = '' }) {
  const [coverError, setCoverError] = useState(false)
  const [coverLoading, setCoverLoading] = useState(true)
  
  // Get first letter of title for fallback
  const firstLetter = title?.trim().charAt(0).toUpperCase() || '?'

  const handleImageLoad = () => {
    setCoverLoading(false)
  }

  const handleImageError = () => {
    setCoverError(true)
    setCoverLoading(false)
  }

  // If no thumbnail URL or error loading, show first letter
  if (coverError || !coverUrl) {
    return (
      <div 
        className={`bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-4xl ${className}`}
        style={{ aspectRatio: '2/3' }}
      >
        {firstLetter}
      </div>
    )
  }

  // Show thumbnail image
  return (
    <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
      {coverLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center z-10">
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      )}
      <img
        src={coverUrl}
        alt={title || 'Book cover'}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className="w-full h-full object-contain"
        style={{ display: coverLoading ? 'none' : 'block' }}
      />
    </div>
  )
}

export default BookCover

