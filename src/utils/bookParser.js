// Helper function to clone ArrayBuffer
const cloneArrayBuffer = (buffer) => {
  const cloned = new ArrayBuffer(buffer.byteLength)
  new Uint8Array(cloned).set(new Uint8Array(buffer))
  return cloned
}

// Parse EPUB file
export const parseEPUB = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result
        // Clone ArrayBuffer before using with EPUB.js to prevent detachment
        const clonedBuffer = cloneArrayBuffer(arrayBuffer)
        
        const EPUB = (await import('epubjs')).default
        const book = EPUB(clonedBuffer)
        
        await book.loaded.metadata
        const metadata = await book.loaded.metadata
        
        // Get cover
        let coverUrl = null
        try {
          const cover = await book.coverUrl()
          if (cover) {
            coverUrl = cover
          }
        } catch (err) {
          console.warn('No cover found', err)
        }
        
        // Store book data with original ArrayBuffer (not the cloned one)
        const bookData = {
          title: metadata.title || file.name.replace(/\.epub$/i, ''),
          author: metadata.creator || 'Unknown Author',
          cover: coverUrl,
          format: 'epub',
          source: 'uploaded',
          metadata: {
            publisher: metadata.publisher,
            language: metadata.language,
            description: metadata.description
          },
          fileData: arrayBuffer // Use original buffer for storage
        }
        
        resolve(bookData)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// Parse PDF file
export const parsePDF = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result
        // Clone ArrayBuffer before using with PDF.js to prevent detachment
        const clonedBuffer = cloneArrayBuffer(arrayBuffer)
        
        // Use PDF.js to get metadata
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
        
        const loadingTask = pdfjsLib.getDocument({ data: clonedBuffer })
        const pdf = await loadingTask.promise
        
        const metadata = await pdf.getMetadata()
        const info = metadata.info || {}
        
        // Try to get first page as cover
        let coverUrl = null
        try {
          const page = await pdf.getPage(1)
          const viewport = page.getViewport({ scale: 1.0 })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          canvas.height = viewport.height
          canvas.width = viewport.width
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise
          
          coverUrl = canvas.toDataURL('image/png')
        } catch (err) {
          console.warn('Could not generate PDF cover', err)
        }
        
        const bookData = {
          title: info.Title || file.name.replace(/\.pdf$/i, ''),
          author: info.Author || 'Unknown Author',
          cover: coverUrl,
          format: 'pdf',
          source: 'uploaded',
          metadata: {
            subject: info.Subject,
            keywords: info.Keywords
          },
          fileData: arrayBuffer, // Use original buffer for storage
          pageCount: pdf.numPages
        }
        
        resolve(bookData)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// Parse uploaded file (auto-detect format)
export const parseBookFile = async (file) => {
  const extension = file.name.split('.').pop().toLowerCase()
  
  if (extension === 'epub') {
    return await parseEPUB(file)
  } else if (extension === 'pdf') {
    return await parsePDF(file)
  } else {
    throw new Error(`Unsupported file format: ${extension}`)
  }
}

