import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Library from './pages/Library'
import Auth from './components/Auth'

// Lazy load the Reader component (includes heavy PDF.js library)
const Reader = lazy(() => import('./pages/Reader'))

function App() {
  return (
    <Router>
      <Auth>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-lg">Loading reader...</div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/reader/:bookId" element={<Reader />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Auth>
    </Router>
  )
}

export default App
