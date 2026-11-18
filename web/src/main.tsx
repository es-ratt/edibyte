import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { useAppStore } from './app/store'
import './styles/index.css'

function App() {
  const hydrated = useAppStore((s) => s.hydrated)
  // Settings come from IndexedDB; render nothing for the few ms until they are read,
  // so the first screen is already in the user's language.
  return hydrated ? <RouterProvider router={router} /> : null
}

void useAppStore.getState().hydrate()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
