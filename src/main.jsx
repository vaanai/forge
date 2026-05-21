import { StrictMode } from 'react'
import { createRoot }  from 'react-dom/client'
import App from './App.jsx'

// Dev only: stale PWA service workers on localhost:5173 can serve a broken cached bundle
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister())
  })
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(key => caches.delete(key)))
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
