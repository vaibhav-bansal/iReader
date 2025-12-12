import Dexie from 'dexie'

const db = new Dexie('iReaderDB')

db.version(1).stores({
  books: '++id, title, author, cover, format, source, metadata, addedAt, fileData',
  progress: 'bookId, position, percentage, lastOpened, timeSpent',
  annotations: '++id, bookId, type, location, content, color, timestamp'
})

// Version 2: Add preferences field to books table
db.version(2).stores({
  books: '++id, title, author, cover, format, source, metadata, addedAt, fileData, preferences',
  progress: 'bookId, position, percentage, lastOpened, timeSpent',
  annotations: '++id, bookId, type, location, content, color, timestamp'
}).upgrade(tx => {
  // Migrate existing books: set default preferences
  return tx.table('books').toCollection().modify(book => {
    if (!book.preferences) {
      book.preferences = {}
    }
  })
})

export default db

