// In-memory IndexedDB for unit tests.
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest globals are off, so Testing Library cannot register its automatic cleanup.
afterEach(() => cleanup())
