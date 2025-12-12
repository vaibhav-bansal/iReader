import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PostHogProvider } from 'posthog-js/react'
import App from './App'
import './index.css'

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration)
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error)
      })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={{
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
        defaults: '2025-05-24',
        capture_exceptions: true, // This enables capturing exceptions using Error Tracking, set to false if you don't want this
        debug: import.meta.env.MODE === 'development',
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PostHogProvider>
  </React.StrictMode>,
)
