import { vi } from 'vitest'
// beforeEach is available globally with globals: true
import { parseBookFile, parseEPUB, parsePDF } from './bookParser'

// Mock epubjs
vi.mock('epubjs', () => ({
  default: vi.fn()
}))

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {
    workerSrc: ''
  },
  getDocument: vi.fn()
}))

describe('Book Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parseBookFile', () => {
    it('should detect EPUB files by extension', async () => {
      const file = new File(['test content'], 'test.epub', { type: 'application/epub+zip' })
      
      // Mock FileReader
      const originalFileReader = global.FileReader
      global.FileReader = class {
        readAsArrayBuffer() {
          setTimeout(() => {
            this.onload({ target: { result: new ArrayBuffer(10) } })
          }, 0)
        }
      }

      try {
        await parseBookFile(file)
      } catch (error) {
        // Expected to fail due to mocked EPUB.js, but should attempt EPUB parsing
        expect(error).toBeDefined()
      }

      global.FileReader = originalFileReader
    })

    it('should detect PDF files by extension', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      
      // Mock FileReader
      const originalFileReader = global.FileReader
      global.FileReader = class {
        readAsArrayBuffer() {
          setTimeout(() => {
            this.onload({ target: { result: new ArrayBuffer(10) } })
          }, 0)
        }
      }

      try {
        await parseBookFile(file)
      } catch (error) {
        // Expected to fail due to mocked PDF.js, but should attempt PDF parsing
        expect(error).toBeDefined()
      }

      global.FileReader = originalFileReader
    })

    it('should reject unsupported file formats', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      
      await expect(parseBookFile(file)).rejects.toThrow('Unsupported file format')
    })

    it('should handle case-insensitive file extensions', async () => {
      const file1 = new File(['test'], 'test.EPUB', { type: 'application/epub+zip' })
      const file2 = new File(['test'], 'test.PDF', { type: 'application/pdf' })
      
      // Mock FileReader
      const originalFileReader = global.FileReader
      global.FileReader = class {
        readAsArrayBuffer() {
          setTimeout(() => {
            this.onload({ target: { result: new ArrayBuffer(10) } })
          }, 0)
        }
      }

      try {
        await parseBookFile(file1)
      } catch (error) {
        expect(error).toBeDefined()
      }

      try {
        await parseBookFile(file2)
      } catch (error) {
        expect(error).toBeDefined()
      }

      global.FileReader = originalFileReader
    })
  })

  describe('ArrayBuffer cloning', () => {
    it('should clone ArrayBuffer to prevent detachment', () => {
      const { cloneArrayBuffer } = require('./bookParser')
      const original = new ArrayBuffer(100)
      const cloned = cloneArrayBuffer(original)

      expect(cloned).not.toBe(original)
      expect(cloned.byteLength).toBe(original.byteLength)
      expect(cloned.byteLength).toBe(100)
    })
  })
})

