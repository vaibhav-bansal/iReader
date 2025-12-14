// PDF.js worker configuration for react-pdf v9+
// This must be imported before using react-pdf Document/Page components
import { pdfjs } from 'react-pdf'

// Use CDN approach - most reliable with Vite
// react-pdf v9+ uses .mjs extension for the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

