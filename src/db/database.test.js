// beforeEach and afterEach are available globally with globals: true
import db from './database'

describe('Database', () => {
  beforeEach(async () => {
    await db.books.clear()
    await db.progress.clear()
    await db.annotations.clear()
  })

  afterEach(async () => {
    await db.books.clear()
    await db.progress.clear()
    await db.annotations.clear()
  })

  it('should have books table with correct schema', async () => {
    const book = {
      title: 'Test Book',
      author: 'Test Author',
      format: 'epub',
      source: 'uploaded',
      fileData: new ArrayBuffer(100),
      addedAt: new Date().toISOString()
    }

    const id = await db.books.add(book)
    const retrieved = await db.books.get(id)

    expect(retrieved).toBeDefined()
    expect(retrieved.title).toBe('Test Book')
    expect(retrieved.format).toBe('epub')
  })

  it('should have progress table with correct schema', async () => {
    const progress = {
      bookId: 1,
      position: 'cfi(/6/4)',
      percentage: 50,
      lastOpened: new Date().toISOString()
    }

    await db.progress.put(progress)
    const retrieved = await db.progress.get(1)

    expect(retrieved).toBeDefined()
    expect(retrieved.percentage).toBe(50)
    expect(retrieved.position).toBe('cfi(/6/4)')
  })

  it('should have annotations table with correct schema', async () => {
    const annotation = {
      bookId: 1,
      type: 'highlight',
      location: 'cfi(/6/4)',
      content: 'Selected text',
      color: 'yellow',
      timestamp: new Date().toISOString()
    }

    const id = await db.annotations.add(annotation)
    const retrieved = await db.annotations.get(id)

    expect(retrieved).toBeDefined()
    expect(retrieved.type).toBe('highlight')
    expect(retrieved.color).toBe('yellow')
  })

  it('should support querying progress by bookId', async () => {
    await db.progress.put({ bookId: 1, position: 'page1', percentage: 10 })
    await db.progress.put({ bookId: 2, position: 'page2', percentage: 20 })

    const book1Progress = await db.progress.where('bookId').equals(1).first()
    expect(book1Progress).toBeDefined()
    expect(book1Progress.percentage).toBe(10)
  })

  it('should support querying annotations by bookId', async () => {
    await db.annotations.add({ bookId: 1, type: 'highlight', location: 'page1', content: 'text1' })
    await db.annotations.add({ bookId: 2, type: 'note', location: 'page2', content: 'text2' })

    const book1Annotations = await db.annotations.where('bookId').equals(1).toArray()
    expect(book1Annotations.length).toBe(1)
    expect(book1Annotations[0].type).toBe('highlight')
  })
})

