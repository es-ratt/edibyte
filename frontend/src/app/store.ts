import { create } from 'zustand'
import { ageOn, parseProfile, teenModeOn, type Profile } from '@/features/profile/model'
import { clearAllData, getProfile, getSetting, saveProfile, setSetting } from '@/lib/db'
import { htmlLang, translate, UI_LANGS, type Lang, type TKey } from '@/lib/i18n'

export interface SafetySettings {
  /** Adults (18+) may opt in; under 18 teen mode is always on regardless of this value. */
  adultTeenMode: boolean
  pauseTracking: boolean
  hideNumbers: boolean
  /** Off by default (teen safety). No notifications are sent in this version. */
  notifications: boolean
  /** Set by a flagged wellbeing check-in: tracking is hidden and the support card is shown. */
  wellbeingFlagged: boolean
  /** Send anonymous usage counts (names and numbers only, live mode only). */
  shareUsage: boolean
}

export const DEFAULT_SAFETY: SafetySettings = {
  adultTeenMode: false,
  pauseTracking: false,
  hideNumbers: false,
  notifications: false,
  wellbeingFlagged: false,
  shareUsage: true,
}

export interface AppState {
  hydrated: boolean
  lang: Lang
  lowData: boolean
  /** Set when the user taps "Let's start" on /welcome. */
  welcomed: boolean
  profile: Profile | null
  safety: SafetySettings
  hydrate: () => Promise<void>
  setLang: (lang: Lang) => void
  setLowData: (on: boolean) => void
  setWelcomed: () => void
  setProfile: (profile: Profile) => Promise<void>
  setSafety: (patch: Partial<SafetySettings>) => void
  /** "Delete all my data": wipes IndexedDB and returns the app to first run. */
  deleteAll: () => Promise<boolean>
}

function applyLang(lang: Lang): void {
  document.documentElement.lang = htmlLang(lang)
}

export const useAppStore = create<AppState>()((set, get) => ({
  hydrated: false,
  lang: 'bn',
  lowData: false,
  welcomed: false,
  profile: null,
  safety: DEFAULT_SAFETY,
  hydrate: async () => {
    const [lang, lowData, welcomed, rawProfile, safety] = await Promise.all([
      getSetting<Lang>('lang', 'bn'),
      getSetting<boolean>('lowData', false),
      getSetting<boolean>('welcomed', false),
      getProfile(),
      getSetting<Partial<SafetySettings>>('safety', {}),
    ])
    const safeLang = UI_LANGS.includes(lang) ? lang : 'bn'
    applyLang(safeLang)
    set({
      hydrated: true,
      lang: safeLang,
      lowData,
      welcomed,
      profile: parseProfile(rawProfile),
      safety: { ...DEFAULT_SAFETY, ...safety },
    })
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
  setProfile: async (profile) => {
    set({ profile })
    await saveProfile({ ...profile })
  },
  setSafety: (patch) => {
    const safety = { ...get().safety, ...patch }
    set({ safety })
    void setSetting('safety', safety)
  },
  deleteAll: async () => {
    const ok = await clearAllData()
    set({ welcomed: false, profile: null, safety: DEFAULT_SAFETY, lowData: false })
    return ok
  },
}))

/** Translation hook bound to the current language. */
export function useT(): (key: TKey, vars?: Record<string, string | number>) => string {
  const lang = useAppStore((s) => s.lang)
  return (key, vars) => translate(lang, key, vars)
}

export interface Mode {
  age: number | null
  teen: boolean
  /** Tracking hidden: paused by the user or after a flagged wellbeing check-in. */
  trackingHidden: boolean
  hideNumbers: boolean
}

/** Derived teen and safety mode for the current profile. */
export function useMode(): Mode {
  const profile = useAppStore((s) => s.profile)
  const safety = useAppStore((s) => s.safety)
  const age = profile ? ageOn(profile.birthYear, profile.birthMonth) : null
  const teen = age !== null && teenModeOn(age, safety.adultTeenMode)
  return {
    age,
    teen,
    trackingHidden: safety.pauseTracking || safety.wellbeingFlagged,
    hideNumbers: safety.hideNumbers,
  }
}
