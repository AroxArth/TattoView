import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'

import { App } from '@/App'
import '@/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root container #root not found in index.html')

createRoot(container).render(
  <StrictMode>
    <App />
    <Toaster theme="dark" position="bottom-right" richColors closeButton />
  </StrictMode>,
)
