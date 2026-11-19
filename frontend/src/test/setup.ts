// In-memory IndexedDB for unit tests.
import 'fake-indexeddb/auto'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// The demo adapter adds small delays (300 ms per call, 1.2 s for a photo). The default 1 s wait for
// findBy* was flaky on a cold first run, so allow 5 s.
configure({ asyncUtilTimeout: 5000 })

// Vitest globals are off, so Testing Library cannot register its automatic cleanup.
afterEach(() => cleanup())
