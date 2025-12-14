function BookCoverSkeleton({ className = '' }) {
  return (
    <div 
      className={`bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse relative overflow-hidden ${className}`}
      style={{ aspectRatio: '2/3' }}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
      
      {/* Book-like placeholder elements */}
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 bg-gray-400/50 rounded mb-3"></div>
        <div className="w-20 h-2 bg-gray-400/50 rounded mb-2"></div>
        <div className="w-16 h-2 bg-gray-400/50 rounded"></div>
      </div>
    </div>
  )
}

export default BookCoverSkeleton

