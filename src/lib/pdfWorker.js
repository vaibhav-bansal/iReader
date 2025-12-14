// PDF.js worker configuration for react-pdf v9+
// This must be imported before using react-pdf Document/Page components
import { pdfjs } from 'react-pdf'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Vite resolves the ?url import to an asset URL that works in both dev and prod
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

console.log('PDF.js worker configured:', pdfjs.GlobalWorkerOptions.workerSrc)
