// Helper function to clone ArrayBuffer
export const cloneArrayBuffer = (buffer) => {
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
        
        // Get cover and convert blob URL to data URL for persistence
        let coverUrl = null
        try {
          const coverBlobUrl = await book.coverUrl()
          if (coverBlobUrl) {
            // Convert blob URL to data URL so it persists across page refreshes
            try {
              const response = await fetch(coverBlobUrl)
              const blob = await response.blob()
              coverUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.onerror = reject
                reader.readAsDataURL(blob)
              })
              // Revoke the blob URL to free memory
              URL.revokeObjectURL(coverBlobUrl)
            } catch (conversionError) {
              console.warn('Could not convert cover blob URL to data URL', conversionError)
              // Fallback to blob URL if conversion fails
              coverUrl = coverBlobUrl
            }
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

// Parse PDF file using PDF.js (via react-pdf-viewer's underlying library)
export const parsePDF = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result
        // Clone ArrayBuffer before using with PDF.js to prevent detachment
        const clonedBuffer = cloneArrayBuffer(arrayBuffer)
        
        // Use PDF.js to get metadata and cover
        const pdfjsLib = await import('pdfjs-dist')
        // Set worker source for PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.js',
          import.meta.url
        ).toString()
        
        const loadingTask = pdfjsLib.getDocument({ data: clonedBuffer })
        const pdf = await loadingTask.promise
        
        // Get metadata
        const metadata = await pdf.getMetadata()
        const info = metadata.info || {}
        
        // Extract cover from first page using library's rendering
        let coverUrl = null
        try {
          const page = await pdf.getPage(1)
          const viewport = page.getViewport({ scale: 2.0 }) // Higher scale for better cover quality
          
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          const devicePixelRatio = window.devicePixelRatio || 1
          
          // Set canvas size accounting for device pixel ratio
          canvas.width = Math.floor(viewport.width * devicePixelRatio)
          canvas.height = Math.floor(viewport.height * devicePixelRatio)
          canvas.style.width = `${viewport.width}px`
          canvas.style.height = `${viewport.height}px`
          
          // Scale context for high-DPI rendering
          context.scale(devicePixelRatio, devicePixelRatio)
          
          // Render page
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

