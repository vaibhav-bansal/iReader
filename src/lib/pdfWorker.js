// PDF.js worker configuration for react-pdf v9+
// This must be imported before using react-pdf Document/Page components
import { pdfjs } from 'react-pdf'

// Determine worker URL based on environment
// In production, Vite copies public/ files to dist/ root, so we can use the root path
// Fallback to CDN if local file is not available
const baseUrl = import.meta.env.BASE_URL || '/'
const localWorkerUrl = `${baseUrl}pdf.worker.min.mjs`.replace(/\/\//g, '/')
const cdnWorkerUrl = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// Use local worker in production (file should be in dist root)
// In development, also try local first, then fallback to CDN
// For production builds, the file from public/ is copied to dist/ root by Vite
const isProduction = import.meta.env.PROD
const workerUrl = isProduction ? localWorkerUrl : localWorkerUrl

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

console.log('PDF.js worker configured:', pdfjs.GlobalWorkerOptions.workerSrc)
console.log('Environment:', isProduction ? 'production' : 'development')
console.log('CDN fallback available:', cdnWorkerUrl)

// Note: If local worker fails, PDF.js will show an error
// The worker file should be at /pdf.worker.min.mjs in production (copied from public/)
