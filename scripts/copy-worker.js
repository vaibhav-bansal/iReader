// Script to copy pdfjs worker file to public directory
// IMPORTANT: Use react-pdf's bundled pdfjs-dist version to ensure compatibility
// react-pdf v10 uses pdfjs-dist 5.4.296, not the directly installed version
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Use pdfjs-dist worker directly (installed as dependency)
const source = path.join(
  rootDir,
  'node_modules',
  'pdfjs-dist',
  'build',
  'pdf.worker.min.mjs'
)
const destDir = path.join(rootDir, 'public')
const destMin = path.join(destDir, 'pdf.worker.min.mjs')
const destDefault = path.join(destDir, 'pdf.worker.mjs')

// Create public directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true })
}

if (fs.existsSync(source)) {
  fs.copyFileSync(source, destMin)
  fs.copyFileSync(source, destDefault)
  console.log('✓ PDF.js worker file copied to public/pdf.worker.min.mjs and public/pdf.worker.mjs')
} else {
  console.error('❌ Worker file not found at:', source)
  console.error('   Make sure react-pdf is installed correctly')
  process.exit(1)
}

