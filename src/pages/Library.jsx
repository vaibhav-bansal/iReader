import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllBooks, deleteBook, getProgress, addBook } from '../utils/storage'
import { parseBookFile } from '../utils/bookParser'
import { getPreferences } from '../utils/storage'
import './Library.css'

function Library() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadBooks()
    applyTheme()
  }, [])

  const loadBooks = async () => {
    try {
      const allBooks = await getAllBooks()
      // Enrich with progress data
      const booksWithProgress = await Promise.all(
        allBooks.map(async (book) => {
          const progress = await getProgress(book.id)
          return {
            ...book,
            progress: progress ? progress.percentage : 0,
            lastOpened: progress ? progress.lastOpened : book.addedAt
          }
        })
      )
      setBooks(booksWithProgress)
    } catch (error) {
      console.error('Error loading books:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyTheme = () => {
    const prefs = getPreferences()
    document.documentElement.setAttribute('data-theme', prefs.theme)
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const bookData = await parseBookFile(file)
      const bookId = await addBook(bookData)
      await loadBooks()
      // Navigate to reader
      navigate(`/reader/${bookId}`)
    } catch (error) {
      console.error('Error uploading book:', error)
      alert(`Error uploading book: ${error.message}`)
    } finally {
      setUploading(false)
      // Reset input
      event.target.value = ''
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files[0]
    if (!file) return

    const extension = file.name.split('.').pop().toLowerCase()
    if (extension !== 'epub' && extension !== 'pdf') {
      alert('Please upload an EPUB or PDF file')
      return
    }

    setUploading(true)
    try {
      const bookData = await parseBookFile(file)
      const bookId = await addBook(bookData)
      await loadBooks()
      navigate(`/reader/${bookId}`)
    } catch (error) {
      console.error('Error uploading book:', error)
      alert(`Error uploading book: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteBook = async (bookId, e) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to remove this book from your library?')) {
      try {
        await deleteBook(bookId)
        await loadBooks()
      } catch (error) {
        console.error('Error deleting book:', error)
        alert('Error deleting book')
      }
    }
  }

  const handleBookClick = (bookId) => {
    navigate(`/reader/${bookId}`)
  }

  if (loading) {
    return (
      <div className="library-container">
        <div className="loading">Loading library...</div>
      </div>
    )
  }

  return (
    <div className="library-container">
      <header className="library-header">
        <h1>iReader</h1>
        <p className="subtitle">Your Personal E-book Library</p>
      </header>

      <div
        className="upload-area"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          accept=".epub,.pdf"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <label htmlFor="file-upload" className="upload-button">
          {uploading ? 'Uploading...' : '+ Upload Book (EPUB or PDF)'}
        </label>
        <p className="upload-hint">or drag and drop a file here</p>
      </div>

      {books.length === 0 ? (
        <div className="empty-library">
          <p>Your library is empty</p>
          <p className="empty-hint">Upload an EPUB or PDF file to get started</p>
        </div>
      ) : (
        <div className="books-grid">
          {books.map((book) => (
            <div
              key={book.id}
              className="book-card"
              onClick={() => handleBookClick(book.id)}
            >
              <div className="book-cover">
                {book.cover ? (
                  <img src={book.cover} alt={book.title} />
                ) : (
                  <div className="book-cover-placeholder">
                    <span>{book.title.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="book-format-badge">{book.format.toUpperCase()}</div>
                {book.progress > 0 && (
                  <div className="book-progress-bar">
                    <div
                      className="book-progress-fill"
                      style={{ width: `${book.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="book-info">
                <h3 className="book-title">{book.title}</h3>
                <p className="book-author">{book.author}</p>
                {book.progress > 0 && (
                  <p className="book-progress-text">{Math.round(book.progress)}% complete</p>
                )}
              </div>
              <button
                className="book-delete-button"
                onClick={(e) => handleDeleteBook(book.id, e)}
                aria-label="Delete book"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Library

