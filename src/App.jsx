import { Routes, Route } from 'react-router-dom'
import Library from './pages/Library'
import Reader from './pages/Reader'
import './App.css'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/reader/:bookId" element={<Reader />} />
      </Routes>
    </div>
  )
}

export default App

