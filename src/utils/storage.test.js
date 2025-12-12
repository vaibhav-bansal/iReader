// beforeEach and afterEach are available globally with globals: true
import { 
  addBook, 
  getBook, 
  getAllBooks, 
  deleteBook, 
  saveProgress, 
  getProgress,
  getPreferences,
  savePreferences
} from './storage'
import db from '../db/database'

describe('Storage Utilities', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.books.clear()
    await db.progress.clear()
    await db.annotations.clear()
    localStorage.clear()
  })

  afterEach(async () => {
    // Clean up after each test
    await db.books.clear()
    await db.progress.clear()
    await db.annotations.clear()
    localStorage.clear()
  })

  describe('Book Operations', () => {
    it('should add a book to the database', async () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        format: 'epub',
        source: 'uploaded',
        fileData: new ArrayBuffer(100)
      }

      const bookId = await addBook(bookData)
      expect(bookId).toBeDefined()
      expect(typeof bookId).toBe('number')
    })

    it('should retrieve a book by ID', async () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        format: 'epub',
        source: 'uploaded',
        fileData: new ArrayBuffer(100)
      }

      const bookId = await addBook(bookData)
      const retrievedBook = await getBook(bookId)

      expect(retrievedBook).toBeDefined()
      expect(retrievedBook.title).toBe('Test Book')
      expect(retrievedBook.author).toBe('Test Author')
      expect(retrievedBook.format).toBe('epub')
    })

    it('should get all books from the database', async () => {
      const book1 = {
        title: 'Book 1',
        author: 'Author 1',
        format: 'epub',
        source: 'uploaded',
        fileData: new ArrayBuffer(100)
      }

      const book2 = {
        title: 'Book 2',
        author: 'Author 2',
        format: 'pdf',
        source: 'uploaded',
        fileData: new ArrayBuffer(100)
      }

      await addBook(book1)
      await addBook(book2)

      const allBooks = await getAllBooks()
      expect(allBooks.length).toBe(2)
      expect(allBooks.some(b => b.title === 'Book 1')).toBe(true)
      expect(allBooks.some(b => b.title === 'Book 2')).toBe(true)
    })

    it('should delete a book and its associated data', async () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        format: 'epub',
        source: 'uploaded',
        fileData: new ArrayBuffer(100)
      }

      const bookId = await addBook(bookData)
      await saveProgress(bookId, 'cfi(/6/4)', 25)

      await deleteBook(bookId)

      const deletedBook = await getBook(bookId)
      const deletedProgress = await getProgress(bookId)

      expect(deletedBook).toBeUndefined()
      expect(deletedProgress).toBeUndefined()
    })

    it('should sort books by lastOpened date', async () => {
      const book1 = {
        title: 'Book 1',
        author: 'Author 1',
        format: 'epub',
        source: 'uploaded',
        fileData: new ArrayBuffer(100)
      }

      const book2 = {
        title: 'Book 2',
        author: 'Author 2',
        format: 'pdf',
        source: 'uploaded',
        fileData: new ArrayBuffer(100)
      }

      const id1 = await addBook(book1)
      const id2 = await addBook(book2)

      // Set progress for book2 (more recent)
      await saveProgress(id2, 'page1', 10)

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))
      await saveProgress(id1, 'page1', 20)

      const allBooks = await getAllBooks()
      expect(allBooks[0].title).toBe('Book 1') // Most recently opened
    })
  })

  describe('Progress Operations', () => {
    it('should save reading progress', async () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        format: 'epub',
        source: 'uploaded',
        fileData: new ArrayBuffer(100)
      }

      const bookId = await addBook(bookData)
      await saveProgress(bookId, 'cfi(/6/4)', 50)

      const progress = await getProgress(bookId)
      expect(progress).toBeDefined()
      expect(progress.position).toBe('cfi(/6/4)')
      expect(progress.percentage).toBe(50)
      expect(progress.bookId).toBe(bookId)
    })

    it('should update existing progress', async () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        format: 'epub',
        source: 'uploaded',
        fileData: new ArrayBuffer(100)
      }

      const bookId = await addBook(bookData)
      await saveProgress(bookId, 'cfi(/6/4)', 25)
      await saveProgress(bookId, 'cfi(/6/8)', 75)

      const progress = await getProgress(bookId)
      expect(progress.percentage).toBe(75)
      expect(progress.position).toBe('cfi(/6/8)')
    })

    it('should handle PDF page-based progress', async () => {
      const bookData = {
        title: 'Test PDF',
        author: 'Test Author',
        format: 'pdf',
        source: 'uploaded',
        fileData: new ArrayBuffer(100)
      }

      const bookId = await addBook(bookData)
      await saveProgress(bookId, '5', 25) // Page 5, 25% complete

      const progress = await getProgress(bookId)
      expect(progress.position).toBe('5')
      expect(progress.percentage).toBe(25)
    })
  })

  describe('Preferences Operations', () => {
    it('should return default preferences when none are stored', () => {
      const prefs = getPreferences()
      expect(prefs.theme).toBe('light')
      expect(prefs.fontSize).toBe(16)
      expect(prefs.lineSpacing).toBe(1.5)
      expect(prefs.pageWidth).toBe('medium')
      expect(prefs.fontFamily).toBe('serif')
    })

    it('should save and retrieve preferences', () => {
      const customPrefs = {
        theme: 'dark',
        fontSize: 18,
        lineSpacing: 2.0,
        pageWidth: 'wide',
        fontFamily: 'sans-serif'
      }

      savePreferences(customPrefs)
      const retrieved = getPreferences()

      expect(retrieved.theme).toBe('dark')
      expect(retrieved.fontSize).toBe(18)
      expect(retrieved.lineSpacing).toBe(2.0)
      expect(retrieved.pageWidth).toBe('wide')
      expect(retrieved.fontFamily).toBe('sans-serif')
    })

    it('should merge saved preferences with defaults', () => {
      const partialPrefs = {
        theme: 'sepia',
        fontSize: 20
      }

      savePreferences(partialPrefs)
      const retrieved = getPreferences()

      expect(retrieved.theme).toBe('sepia')
      expect(retrieved.fontSize).toBe(20)
      expect(retrieved.lineSpacing).toBe(1.5) // Default value
      expect(retrieved.pageWidth).toBe('medium') // Default value
    })

    it('should handle invalid JSON in localStorage gracefully', () => {
      localStorage.setItem('ireader-preferences', 'invalid json')
      const prefs = getPreferences()
      
      // Should return defaults when JSON is invalid
      expect(prefs.theme).toBe('light')
      expect(prefs.fontSize).toBe(16)
    })
  })
})

