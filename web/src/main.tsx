import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { useAppStore } from './app/store'
import { api } from './lib/api'
import { flushEvents, recordReturns, recordWeeklyHabits } from './lib/analytics'
import './styles/index.css'

function App() {
  const hydrated = useAppStore((s) => s.hydrated)

  // Anonymous adoption events: recorded on the device, sent only in live mode when allowed.
  useEffect(() => {
    if (!hydrated) return
    const { profile, safety } = useAppStore.getState()
    const flush = () => void flushEvents(api, useAppStore.getState().safety.shareUsage)
    void recordReturns()
      .then(() => recordWeeklyHabits(profile?.mealsPerDay ?? 3))
      .then(() => flushEvents(api, safety.shareUsage))
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [hydrated])

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
