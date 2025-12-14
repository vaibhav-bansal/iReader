import { pdfjs } from 'react-pdf'
import './pdfWorker' // Ensure PDF.js worker is configured

/**
 * Generates a thumbnail image from the first page of a PDF file
 * @param {File} pdfFile - The PDF file to generate thumbnail from
 * @param {number} maxWidth - Maximum width of thumbnail (default: 400)
 * @param {number} maxHeight - Maximum height of thumbnail (default: 600)
 * @returns {Promise<Blob>} - The thumbnail image as a Blob
 */
export async function generateThumbnail(pdfFile, maxWidth = 400, maxHeight = 600) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()
    
    fileReader.onload = async (e) => {
      try {
        const typedArray = new Uint8Array(e.target.result)
        
        // Load PDF document
        const loadingTask = pdfjs.getDocument({ data: typedArray })
        const pdf = await loadingTask.promise
        
        // Get first page
        const page = await pdf.getPage(1)
        
        // Calculate scale to fit within max dimensions while maintaining aspect ratio
        const viewport = page.getViewport({ scale: 1.0 })
        const scale = Math.min(
          maxWidth / viewport.width,
          maxHeight / viewport.height,
          2.0 // Max scale of 2x for quality
        )
        
        const scaledViewport = page.getViewport({ scale })
        
        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = scaledViewport.width
        canvas.height = scaledViewport.height
        const context = canvas.getContext('2d')
        
        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise
        
        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to convert canvas to blob'))
            }
          },
          'image/jpeg',
          0.85 // Quality: 0.85 for good balance between size and quality
        )
      } catch (error) {
        reject(error)
      }
    }
    
    fileReader.onerror = () => {
      reject(new Error('Failed to read PDF file'))
    }
    
    fileReader.readAsArrayBuffer(pdfFile)
  })
}

