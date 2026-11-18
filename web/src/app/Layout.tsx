import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarCheck, Camera, Home, MessageCircle, Settings, TrendingUp, WifiOff, FlaskConical, type LucideIcon } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { api } from '@/lib/api'
import { LANGS, type Lang, type TKey } from '@/lib/i18n'
import { useAppStore, useT } from './store'

type Tab = { to: string; label: TKey; icon: LucideIcon; end?: boolean; raised?: boolean; aria?: TKey }

export const TABS: Tab[] = [
  { to: '/', label: 'nav.home', icon: Home, end: true },
  { to: '/progress', label: 'nav.progress', icon: TrendingUp },
  { to: '/capture', label: 'nav.photo', icon: Camera, raised: true, aria: 'nav.photoLabel' },
  { to: '/plans', label: 'nav.plans', icon: CalendarCheck },
  { to: '/coach', label: 'nav.coach', icon: MessageCircle },
]

/** Routes shown full-screen, without the bottom navigation. */
const BARE_ROUTES = ['/welcome', '/onboarding']

function subscribeOnline(cb: () => void): () => void {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
}

const LANG_SHORT: Record<Lang, string> = { bn: 'বাং', en: 'EN', banglish: 'BL' }

function LanguageSwitch() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)
  return (
    <div role="group" aria-label={t('lang.label')} className="flex rounded-full border border-olive-200 bg-surface p-0.5">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          aria-label={t(`lang.${l}`)}
          className={`min-h-10 min-w-10 rounded-full px-2 text-sm font-semibold ${lang === l ? 'bg-olive-700 text-white' : 'text-olive-900'}`}
        >
          {LANG_SHORT[l]}
        </button>
      ))}
    </div>
  )
}

type BannerProps = { icon: LucideIcon; children: ReactNode }

function Banner({ icon: Icon, children }: BannerProps) {
  return (
    <div role="status" className="flex items-center gap-2 bg-mustard-100 px-4 py-2 text-sm font-medium text-ink">
      <Icon size={16} aria-hidden className="shrink-0" />
      <span>{children}</span>
    </div>
  )
}

function UpdatePrompt() {
  const t = useT()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div role="status" className="flex items-center justify-between gap-3 bg-olive-900 px-4 py-2 text-sm text-white">
      <span>{t('banner.update')}</span>
      <button type="button" onClick={() => void updateServiceWorker(true)} className="min-h-10 rounded-full bg-white px-3 font-semibold text-olive-900">
        {t('banner.reload')}
      </button>
    </div>
  )
}

function BottomNav() {
  const t = useT()
  return (
    <nav aria-label={t('nav.main')} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-[480px] grid-cols-5">
        {TABS.map(({ to, label, icon: Icon, end, raised, aria }) => (
          <li key={to} className="flex justify-center">
            <NavLink
              to={to}
              end={end}
              aria-label={aria ? t(aria) : undefined}
              className={({ isActive }) =>
                raised
                  ? 'flex -translate-y-4 flex-col items-center gap-0.5 text-xs font-semibold text-olive-900'
                  : `flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-semibold ${isActive ? 'text-olive-700' : 'text-muted'}`
              }
            >
              {({ isActive }) => (
                <>
                  {raised ? (
                    <span className="grid size-14 place-items-center rounded-full bg-olive-700 text-white shadow-card ring-4 ring-cream">
                      <Icon size={26} aria-hidden />
                    </span>
                  ) : (
                    <Icon size={22} aria-hidden strokeWidth={isActive ? 2.5 : 2} />
                  )}
                  <span>{t(label)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function Layout() {
  const t = useT()
  const online = useOnline()
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  const bare = BARE_ROUTES.includes(pathname)

  // Move focus to the page on navigation (screen-reader and keyboard friendly).
  useEffect(() => {
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-cream">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2">
        {t('nav.skip')}
      </a>
      <header className="sticky top-0 z-20 bg-cream/95 backdrop-blur">
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="text-lg font-semibold text-olive-900" lang="en">
            {t('app.name')}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitch />
            {!bare && (
              <NavLink to="/settings" aria-label={t('nav.settings')} className="grid size-12 place-items-center rounded-full text-olive-900 hover:bg-olive-50">
                <Settings size={22} aria-hidden />
              </NavLink>
            )}
          </div>
        </div>
        {api.mode === 'demo' && <Banner icon={FlaskConical}>{t('banner.demo')}</Banner>}
        {!online && <Banner icon={WifiOff}>{t('banner.offline')}</Banner>}
        <UpdatePrompt />
      </header>
      <main id="main" ref={main} tabIndex={-1} className={`flex-1 px-4 pt-2 outline-none ${bare ? 'pb-8' : 'pb-28'}`}>
        <Outlet />
      </main>
      {!bare && <BottomNav />}
    </div>
  )
}
