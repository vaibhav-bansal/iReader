// PDF.js worker configuration for react-pdf v9+
// This must be imported before using react-pdf Document/Page components
import { pdfjs } from 'react-pdf'

// Use local worker file from public directory
// Vite serves files from public/ at the root path in both dev and production
// This ensures the worker works reliably in production without CDN dependencies
// Use import.meta.env.BASE_URL to handle base paths correctly in production
const baseUrl = import.meta.env.BASE_URL || '/'
const workerPath = `${baseUrl}pdf.worker.min.mjs`.replace(/\/\//g, '/') // Remove double slashes
pdfjs.GlobalWorkerOptions.workerSrc = workerPath

console.log('PDF.js worker configured:', pdfjs.GlobalWorkerOptions.workerSrc)
