import db from '../db/database'

// Book operations
export const addBook = async (bookData) => {
  const bookId = await db.books.add({
    ...bookData,
    addedAt: new Date().toISOString()
  })
  return bookId
}

export const getBook = async (bookId) => {
  return await db.books.get(parseInt(bookId))
}

export const getAllBooks = async () => {
  const books = await db.books.toArray()
  // Sort by lastOpened from progress table
  const booksWithProgress = await Promise.all(
    books.map(async (book) => {
      const progress = await db.progress.get(book.id)
      return {
        ...book,
        lastOpened: progress ? progress.lastOpened : book.addedAt
      }
    })
  )
  // Sort by lastOpened descending
  return booksWithProgress.sort((a, b) => {
    const dateA = new Date(a.lastOpened)
    const dateB = new Date(b.lastOpened)
    return dateB - dateA
  })
}

export const deleteBook = async (bookId) => {
  await db.books.delete(parseInt(bookId))
  await db.progress.where('bookId').equals(parseInt(bookId)).delete()
  await db.annotations.where('bookId').equals(parseInt(bookId)).delete()
}

// Progress operations
export const saveProgress = async (bookId, position, percentage) => {
  await db.progress.put({
    bookId: parseInt(bookId),
    position,
    percentage,
    lastOpened: new Date().toISOString()
  })
}

export const getProgress = async (bookId) => {
  return await db.progress.get(parseInt(bookId))
}

// Preferences (using localStorage for global, IndexedDB for per-book)
export const getPreferences = () => {
  const defaultPrefs = {
    theme: 'light',
    fontSize: 16,
    lineSpacing: 1.5,
    pageWidth: 'medium',
    fontFamily: 'serif'
    // Note: twoPageMode is now per-book, not global
  }
  
  const stored = localStorage.getItem('ireader-preferences')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      // Remove twoPageMode from global preferences if it exists (migration)
      const { twoPageMode, ...globalPrefs } = parsed
      return { ...defaultPrefs, ...globalPrefs }
    } catch (e) {
      return defaultPrefs
    }
  }
  return defaultPrefs
}

export const savePreferences = (preferences) => {
  // Remove twoPageMode from global preferences before saving
  const { twoPageMode, ...globalPrefs } = preferences
  localStorage.setItem('ireader-preferences', JSON.stringify(globalPrefs))
}

// Per-book preferences (stored in IndexedDB)
export const getBookPreferences = async (bookId) => {
  const book = await db.books.get(parseInt(bookId))
  return book?.preferences || {}
}

export const saveBookPreferences = async (bookId, preferences) => {
  await db.books.update(parseInt(bookId), { preferences })
}

