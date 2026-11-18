import type { ProfileSummary } from '@/features/profile/model'
import type { Lang } from '@/lib/i18n'
import type { ReferenceTargets } from '@/lib/targets'
import { ApiError, type Api, type DataStatus, type FoodHit, type Health } from './types'

const TIMEOUT_MS = 20_000

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
    if (!res.ok) throw new ApiError(`HTTP ${res.status} on ${path}`, res.status)
    return (await res.json()) as T
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error
    // Network error, CORS, timeout or a sleeping free-tier server.
    throw new ApiError(error instanceof Error ? error.message : 'Network error', 0)
  } finally {
    clearTimeout(timer)
  }
}

export function createLiveApi(baseUrl: string): Api {
  const base = baseUrl.replace(/\/$/, '')
  return {
    mode: 'live',
    health: () => request<Health>(base, '/health'),
    dataStatus: () => request<DataStatus>(base, '/data/status'),
    searchFoods: async (query: string, _lang: Lang): Promise<FoodHit[]> =>
      request<FoodHit[]>(base, `/foods?query=${encodeURIComponent(query)}&limit=10`),
    referenceTargets: (s: ProfileSummary): Promise<ReferenceTargets> => {
      // Only age band inputs leave the device: age, sex, activity.
      const q = new URLSearchParams({ age: String(s.age), sex: s.sex, activity: s.activity })
      return request<ReferenceTargets>(base, `/reference/targets?${q}`)
    },
  }
}
