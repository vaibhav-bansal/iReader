import Dexie from 'dexie'

const db = new Dexie('iReaderDB')

db.version(1).stores({
  books: '++id, title, author, cover, format, source, metadata, addedAt, fileData',
  progress: 'bookId, position, percentage, lastOpened, timeSpent',
  annotations: '++id, bookId, type, location, content, color, timestamp'
})

export default db

