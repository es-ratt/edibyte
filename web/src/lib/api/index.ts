import { createDemoApi } from './demo'
import { createLiveApi } from './live'
import type { Api } from './types'

export * from './types'

/**
 * Demo mode when VITE_USE_MOCK_DATA=true, or when no backend URL is configured at all
 * (a static host must never point at a localhost default it cannot reach).
 */
export function selectApi(env: { VITE_API_BASE_URL?: string; VITE_USE_MOCK_DATA?: string }): Api {
  const base = env.VITE_API_BASE_URL?.trim()
  if (env.VITE_USE_MOCK_DATA === 'true' || !base) return createDemoApi()
  return createLiveApi(base)
}

export const api: Api = selectApi(import.meta.env)
