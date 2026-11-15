import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// The old demo login kept a name and email in localStorage. It was removed (minimum data,
// nothing to secure); erase what earlier versions saved.
try {
  localStorage.removeItem('edibyte.user')
} catch {
  /* storage blocked */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
