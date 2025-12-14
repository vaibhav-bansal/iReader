import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'ensure-pdf-worker',
      closeBundle() {
        // Ensure worker file is in dist root after build
        const workerSource = join(__dirname, 'public', 'pdf.worker.min.mjs')
        const workerDest = join(__dirname, 'dist', 'pdf.worker.min.mjs')
        
        if (existsSync(workerSource) && !existsSync(workerDest)) {
          copyFileSync(workerSource, workerDest)
          console.log('✓ PDF worker file copied to dist root')
        }
      }
    }
  ],
  optimizeDeps: {
    exclude: ['pdfjs-dist']
  },
  // Ensure public files are copied to dist root
  publicDir: 'public'
})
