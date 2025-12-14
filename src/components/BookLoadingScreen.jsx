import { useState, useEffect } from 'react'

const loadingMessages = [
  'Preparing book for your focused reading',
  'Restoring your reading progress',
  'Wear your reading glasses',
  'Setting up your reading environment',
  'Loading your bookmarks',
  'Almost ready...',
]

function BookLoadingScreen({ messageIndex = 0 }) {
  const [currentMessage, setCurrentMessage] = useState(loadingMessages[0])
  const [dots, setDots] = useState('')

  useEffect(() => {
    setCurrentMessage(loadingMessages[messageIndex] || loadingMessages[0])
  }, [messageIndex])

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return ''
        return prev + '.'
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        {/* Animated book icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-24 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-2xl transform rotate-3 animate-pulse"></div>
            <div className="absolute inset-0 w-24 h-32 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg shadow-xl transform -rotate-3"></div>
          </div>
        </div>
        
        {/* Loading message */}
        <div className="text-xl font-medium text-gray-700 mb-2">
          {currentMessage}
          <span className="inline-block w-4 text-blue-600">{dots}</span>
        </div>
        
        {/* Progress bar */}
        <div className="w-64 h-1 bg-gray-200 rounded-full overflow-hidden mx-auto mt-4">
          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse" 
               style={{ width: '60%' }}></div>
        </div>
      </div>
    </div>
  )
}

export default BookLoadingScreen

