import { create } from 'zustand'
import { getSetting, setSetting } from '@/lib/db'
import { htmlLang, LANGS, translate, type Lang, type TKey } from '@/lib/i18n'

export interface AppState {
  hydrated: boolean
  lang: Lang
  lowData: boolean
  /** Set when the user taps "Let's start" on /welcome. */
  welcomed: boolean
  hydrate: () => Promise<void>
  setLang: (lang: Lang) => void
  setLowData: (on: boolean) => void
  setWelcomed: () => void
}

function applyLang(lang: Lang): void {
  document.documentElement.lang = htmlLang(lang)
}

export const useAppStore = create<AppState>()((set) => ({
  hydrated: false,
  lang: 'bn',
  lowData: false,
  welcomed: false,
  hydrate: async () => {
    const [lang, lowData, welcomed] = await Promise.all([
      getSetting<Lang>('lang', 'bn'),
      getSetting<boolean>('lowData', false),
      getSetting<boolean>('welcomed', false),
    ])
    const safeLang = LANGS.includes(lang) ? lang : 'bn'
    applyLang(safeLang)
    set({ hydrated: true, lang: safeLang, lowData, welcomed })
  },
  setLang: (lang) => {
    applyLang(lang)
    set({ lang })
    void setSetting('lang', lang)
  },
  setLowData: (lowData) => {
    set({ lowData })
    void setSetting('lowData', lowData)
  },
  setWelcomed: () => {
    set({ welcomed: true })
    void setSetting('welcomed', true)
  },
}))

/** Translation hook bound to the current language. */
export function useT(): (key: TKey, vars?: Record<string, string | number>) => string {
  const lang = useAppStore((s) => s.lang)
  return (key, vars) => translate(lang, key, vars)
}
