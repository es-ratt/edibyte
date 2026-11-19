// Thin typed client for the EdiByte backend.
// With VITE_USE_MOCK_DATA=true every call goes to ./mock instead (UI work only).

import type {
  ChatTurn,
  CoachResponse,
  DataStatus,
  DemoProfile,
  EvalResults,
  Food,
  Health,
  MealType,
  ParseResponse,
  Profile,
  ReportItemIn,
  ReportResponse,
  Targets,
  ApiLang,
} from '@/types/api'
import { mockApi } from './mock'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'
const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 30000): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: init.signal ?? ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    })
    if (!res.ok) {
      let detail = res.statusText
      let code: string | undefined
      try {
        const body = await res.json()
        detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
        code = body.code
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(detail, res.status, code ?? (res.status === 429 ? 'rate_limited' : undefined))
    }
    return (await res.json()) as T
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError('network', 0, 'network')
  } finally {
    clearTimeout(timer)
  }
}

const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) })

const realApi = {
  health: (timeoutMs = 8000) => request<Health>('/health', {}, timeoutMs),
  parseMeal: (text: string, lang: ApiLang) => post<ParseResponse>('/meal/parse', { text, lang }),
  parseImage: async (file: File, lang: ApiLang): Promise<ParseResponse> => {
    const form = new FormData()
    form.append('image', file)
    form.append('lang', lang)
    const res = await fetch(`${BASE}/meal/parse-image`, { method: 'POST', body: form })
    if (!res.ok) throw new ApiError((await res.json().catch(() => ({}))).detail ?? 'error', res.status)
    return res.json()
  },
  report: (items: ReportItemIn[], profile: Profile, lang: ApiLang, mealType: MealType | null, sessionId: string | null) =>
    post<ReportResponse>('/meal/report', { items, profile, lang, meal_type: mealType, session_id: sessionId }),
  coach: (question: string, lang: ApiLang, profile: Profile, history: ChatTurn[]) =>
    post<CoachResponse>('/coach', { question, lang, profile, history }),
  foods: (query = '', limit = 20) =>
    request<Food[]>(`/foods?${new URLSearchParams({ ...(query ? { query } : {}), limit: String(limit) })}`),
  demoProfiles: () => request<DemoProfile[]>('/profiles/demo'),
  targets: (profile: Profile) => post<Targets>('/profiles/targets', profile),
  dataStatus: () => request<DataStatus>('/data/status'),
  evalResults: () => request<EvalResults>('/eval/results'),
  clearData: (sessionId: string) =>
    request<{ deleted: number }>('/session/data', { method: 'DELETE', headers: { 'X-Session-Id': sessionId } }),
}

export type Api = typeof realApi
export const api: Api = USE_MOCK ? mockApi : realApi
