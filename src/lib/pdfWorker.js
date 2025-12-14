// PDF.js worker configuration for react-pdf v9+
// This must be imported before using react-pdf Document/Page components
import { pdfjs } from 'react-pdf'

// Use CDN approach - most reliable with Vite
// react-pdf v9+ uses .mjs extension for the worker
// Using explicit HTTPS protocol to ensure it works on both localhost and production
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

console.log('PDF.js worker configured:', pdfjs.GlobalWorkerOptions.workerSrc)
