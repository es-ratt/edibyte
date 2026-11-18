import type { ProfileSummary } from '@/features/profile/model'
import type { CheckRequest, CheckResponse, FoodBrief } from '@/lib/check/types'
import type { Lang } from '@/lib/i18n'
import type { ReferenceTargets } from '@/lib/targets'
import { ApiError, type Api, type DataStatus, type Health, type ParseResult } from './types'

const TIMEOUT_MS = 20_000
/** Photo recognition can take longer (vision model + a free server waking up). */
const PHOTO_TIMEOUT_MS = 45_000

const LANG_PARAM: Record<Lang, string> = { bn: 'bn', en: 'en', banglish: 'banglish' }

async function request<T>(base: string, path: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const outer = init.signal
  if (outer) outer.addEventListener('abort', () => ctrl.abort(), { once: true })
  const isForm = init.body instanceof FormData
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: isForm ? init.headers : { 'Content-Type': 'application/json', ...init.headers },
    })
    if (!res.ok) throw new ApiError(`HTTP ${res.status} on ${path}`, res.status)
    return (await res.json()) as T
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error
    if (outer?.aborted) throw new ApiError('Cancelled', -1)
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
    searchFoods: (query: string, _lang: Lang): Promise<FoodBrief[]> =>
      request<FoodBrief[]>(base, `/foods?query=${encodeURIComponent(query)}&limit=10`),
    referenceTargets: (s: ProfileSummary): Promise<ReferenceTargets> => {
      // Only age band inputs leave the device: age, sex, activity.
      const q = new URLSearchParams({ age: String(s.age), sex: s.sex, activity: s.activity })
      return request<ReferenceTargets>(base, `/reference/targets?${q}`)
    },
    parseMeal: (text: string, lang: Lang): Promise<ParseResult> =>
      request<ParseResult>(base, '/meal/parse', { method: 'POST', body: JSON.stringify({ text, lang: LANG_PARAM[lang] }) }),
    parseImage: (photo: Blob, lang: Lang, signal?: AbortSignal): Promise<ParseResult> => {
      const form = new FormData()
      form.append('image', photo, 'meal.jpg')
      form.append('lang', LANG_PARAM[lang])
      return request<ParseResult>(base, '/meal/parse-image', { method: 'POST', body: form, signal }, PHOTO_TIMEOUT_MS)
    },
    checkMeal: (req: CheckRequest): Promise<CheckResponse> =>
      request<CheckResponse>(base, '/meal/check', { method: 'POST', body: JSON.stringify(req) }),
  }
}
