import { useCallback, useMemo, useState, useEffect } from 'react'
import { Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core'
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout'
import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/default-layout/lib/styles/index.css'
import './PDFViewer.css'

const PDFViewer = ({ 
  fileData, 
  initialPage = 0, 
  onPageChange, 
  onDocumentLoad,
  theme = 'light'
}) => {
  const [error, setError] = useState(null)

  // Create default layout plugin with customized options - memoize to prevent recreation
  const defaultLayoutPluginInstance = useMemo(() => defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      defaultTabs[0], // thumbnails
    ],
  }), [])

  // Handle page changes
  const handlePageChange = useCallback((e) => {
    if (onPageChange) {
      onPageChange(e.currentPage, e.doc?.numPages || 0)
    }
  }, [onPageChange])

  // Handle document load
  const handleDocumentLoad = useCallback((e) => {
    console.log('PDF document loaded:', e.doc.numPages, 'pages')
    if (onDocumentLoad) {
      onDocumentLoad(e.doc.numPages)
    }
  }, [onDocumentLoad])

  // Handle errors
  const handleError = useCallback((e) => {
    console.error('PDF loading error:', e)
    setError(e.message || 'Failed to load PDF')
  }, [])

  // Convert ArrayBuffer to Blob URL for the viewer
  // react-pdf-viewer works best with Blob URLs
  const [fileUrl, setFileUrl] = useState(null)

  useEffect(() => {
    if (!fileData) {
      console.error('No fileData provided to PDFViewer')
      setFileUrl(null)
      return
    }
    
    console.log('PDFViewer fileData type:', typeof fileData, fileData?.constructor?.name)
    
    let blob
    try {
      if (fileData instanceof ArrayBuffer) {
        console.log('Converting ArrayBuffer to Blob, size:', fileData.byteLength)
        blob = new Blob([fileData], { type: 'application/pdf' })
      } else if (fileData instanceof Uint8Array) {
        console.log('Converting Uint8Array to Blob, size:', fileData.length)
        blob = new Blob([fileData], { type: 'application/pdf' })
      } else if (fileData instanceof Blob) {
        console.log('Using Blob directly, size:', fileData.size)
        blob = fileData
      } else {
        throw new Error('Unsupported fileData type')
      }
      
      const url = URL.createObjectURL(blob)
      console.log('Created Blob URL for PDF:', url)
      setFileUrl(url)
      
      // Cleanup function
      return () => {
        if (url) {
          URL.revokeObjectURL(url)
        }
      }
    } catch (err) {
      console.error('Error creating Blob URL for PDF:', err)
      setFileUrl(null)
    }
  }, [fileData])

  if (error) {
    return (
      <div className="pdf-viewer-container pdf-error">
        <div className="pdf-error-message">
          <h3>Error loading PDF</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!fileUrl) {
    return (
      <div className="pdf-viewer-container pdf-loading">
        <div className="pdf-loading-message">
          <div className="loading-spinner" />
          <p>Loading PDF...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`pdf-viewer-container pdf-theme-${theme}`}>
      <Viewer
        fileUrl={fileUrl}
        initialPage={initialPage}
        defaultScale={SpecialZoomLevel.PageWidth}
        onPageChange={handlePageChange}
        onDocumentLoad={handleDocumentLoad}
        onError={handleError}
        plugins={[defaultLayoutPluginInstance]}
      />
    </div>
  )
}

export default PDFViewer
