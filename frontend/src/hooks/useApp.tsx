// App-wide state: language, profile (demo or own), meal draft, backend health and chat.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api } from '@/services/api'
import { LANGS, apiLang, normalizeLang, translate, type Lang, type TKey } from '@/lib/i18n'
import { clearAll, load, save, sessionId } from '@/lib/storage'
import type { ApiLang, ChatTurn, DemoProfile, Health, MealType, ParseResponse, Profile, ReportItemIn, Source } from '@/types/api'

export const DEFAULT_PROFILE: Profile = {
  goal: 'maintain', sex: 'unspecified', age: 25, height_cm: 165, weight_kg: 60,
  activity: 'light', diet: 'any', daily_budget_bdt: null,
}

export type HealthState = 'checking' | 'waking' | 'ready' | 'down'

/** One editable row in the review step. */
export interface ReviewRow {
  key: string
  rawName: string
  food: ParseResponse['items'][number]['food'] | null
  quantity: number | null
  unit: string | null
  confidence: number
  suggestions: ParseResponse['unmatched'][number]['suggestions']
}

export interface MealDraft {
  text: string
  mealType: MealType | null
  rows: ReviewRow[] | null // null = still on the write step
  parseMode: ParseResponse['mode'] | null
  warnings: string[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  mode?: 'ai' | 'offline'
  guardrail?: string | null
  error?: boolean
}

interface AppState {
  lang: Lang
  apiLang: ApiLang
  setLang: (l: Lang) => void
  t: (key: TKey, vars?: Record<string, string | number>) => string
  profile: Profile
  profileSource: string // 'custom' or a demo profile id
  setProfile: (p: Profile) => void
  applyDemo: (id: string) => Promise<void>
  switchToOwnProfile: () => void
  demos: DemoProfile[]
  draft: MealDraft
  setDraft: (d: MealDraft | ((prev: MealDraft) => MealDraft)) => void
  reportItems: ReportItemIn[] | null
  reportMealType: MealType | null
  setReportItems: (items: ReportItemIn[] | null, mealType: MealType | null) => void
  reportLogged: boolean // true once this meal has been saved to the anonymous meal log
  markReportLogged: () => void
  health: HealthState
  healthData: Health | null
  recheckHealth: () => void
  chat: ChatMessage[]
  setChat: (m: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void
  chatHistory: () => ChatTurn[]
  sessionId: string
  clearMyData: () => Promise<void>
}

const Ctx = createContext<AppState | null>(null)

export const EMPTY_DRAFT: MealDraft = { text: '', mealType: null, rows: null, parseMode: null, warnings: [] }

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => normalizeLang(load<Lang>('lang', 'bn')))
  const [profile, setProfileState] = useState<Profile>(() => load('profile', DEFAULT_PROFILE))
  const [ownProfile, setOwnProfile] = useState<Profile>(() => load('ownProfile', load('profile', DEFAULT_PROFILE)))
  const [profileSource, setProfileSource] = useState<string>(() => load('profileSource', 'custom'))
  const [demos, setDemos] = useState<DemoProfile[]>([])
  const [draft, setDraft] = useState<MealDraft>(() => load('draft', EMPTY_DRAFT))
  const [reportItems, setReportItemsState] = useState<ReportItemIn[] | null>(() => load('reportItems', null))
  const [reportLogged, setReportLogged] = useState<boolean>(() => load('reportLogged', false))
  const [reportMealType, setReportMealType] = useState<MealType | null>(() => load('reportMealType', null))
  const [health, setHealth] = useState<HealthState>('checking')
  const [healthData, setHealthData] = useState<Health | null>(null)
  const [chat, setChat] = useState<ChatMessage[]>([])
  const sid = useMemo(() => sessionId(), [])
  const healthRun = useRef(0)

  // <html lang> and font switching follow the UI language.
  useEffect(() => {
    const meta = LANGS.find((l) => l.id === lang)!
    document.documentElement.lang = meta.htmlLang
    document.documentElement.dataset.lang = lang
    document.title = translate(lang, 'app.title')
    save('lang', lang)
  }, [lang])

  // Keep the meal draft across reloads so a refresh never loses the user's edits.
  useEffect(() => save('draft', draft), [draft])

  const t = useCallback((key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang])

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p)
    setOwnProfile(p)
    setProfileSource('custom')
    save('profile', p)
    save('ownProfile', p)
    save('profileSource', 'custom')
  }, [])

  const applyDemo = useCallback(
    async (id: string) => {
      let list = demos
      if (!list.length) {
        list = await api.demoProfiles().catch(() => [])
        setDemos(list)
      }
      const d = list.find((x) => x.id === id)
      if (!d) return
      setProfileState(d.profile)
      setProfileSource(id)
      save('profile', d.profile)
      save('profileSource', id)
    },
    [demos],
  )

  const switchToOwnProfile = useCallback(() => {
    setProfileState(ownProfile)
    setProfileSource('custom')
    save('profile', ownProfile)
    save('profileSource', 'custom')
  }, [ownProfile])

  const setReportItems = useCallback((items: ReportItemIn[] | null, mealType: MealType | null) => {
    setReportItemsState(items)
    setReportMealType(mealType)
    save('reportItems', items)
    setReportLogged(false)
    save('reportLogged', false)
    save('reportMealType', mealType)
  }, [])

  const markReportLogged = useCallback(() => {
    setReportLogged(true)
    save('reportLogged', true)
  }, [])

  // Ping /health on load. Free-tier hosts may take a while to wake up.
  const recheckHealth = useCallback(() => {
    const run = ++healthRun.current
    const started = Date.now()
    setHealth('checking')
    const slowTimer = setTimeout(() => run === healthRun.current && setHealth((h) => (h === 'checking' ? 'waking' : h)), 1500)
    const attempt = async () => {
      try {
        const h = await api.health(10000)
        if (run !== healthRun.current) return
        clearTimeout(slowTimer)
        setHealthData(h)
        setHealth('ready')
      } catch {
        if (run !== healthRun.current) return
        if (Date.now() - started < 90000) {
          setHealth('waking')
          setTimeout(attempt, 3000)
        } else {
          clearTimeout(slowTimer)
          setHealth('down')
        }
      }
    }
    attempt()
  }, [])

  useEffect(() => recheckHealth(), [recheckHealth])

  // Demo profiles load once the backend is up.
  useEffect(() => {
    if (health !== 'ready' || demos.length) return
    api.demoProfiles().then(setDemos).catch(() => undefined)
  }, [health, demos.length])

  const chatHistory = useCallback(
    () => chat.filter((m) => !m.error).slice(-6).map((m) => ({ role: m.role, content: m.content.slice(0, 1500) })),
    [chat],
  )

  const clearMyData = useCallback(async () => {
    try {
      await api.clearData(sid)
    } finally {
      clearAll()
      setProfileState(DEFAULT_PROFILE)
      setOwnProfile(DEFAULT_PROFILE)
      setProfileSource('custom')
      setDraft(EMPTY_DRAFT)
      setReportItemsState(null)
      setChat([])
      save('lang', lang)
    }
  }, [sid, lang])

  const value: AppState = {
    lang, apiLang: apiLang(lang), setLang: setLangState, t,
    profile, profileSource, setProfile, applyDemo, switchToOwnProfile, demos,
    draft, setDraft, reportItems, reportMealType, setReportItems, reportLogged, markReportLogged,
    health, healthData, recheckHealth,
    chat, setChat, chatHistory, sessionId: sid, clearMyData,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside <AppProvider>')
  return v
}

/** Map an API error to a friendly translated message key. */
export function errorKey(e: unknown): TKey {
  const err = e as { status?: number; code?: string }
  if (err?.code === 'rate_limited' || err?.status === 429) return 'common.rateLimited'
  if (err?.status === 0) return 'common.network'
  return 'common.error'
}
