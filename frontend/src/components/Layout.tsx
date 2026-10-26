import { BarChart3, Home, Info, MessageCircle, PenLine, User } from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '@/hooks/useApp'
import { useTryDemo } from '@/hooks/useTryDemo'
import type { TKey } from '@/lib/i18n'
import { Button } from './Button'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ModeBadge } from './ModeBadge'
import { StartupBanner } from './StartupBanner'

const TOP_LINKS: { to: string; key: TKey; end?: boolean }[] = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/log', key: 'nav.log' },
  { to: '/report', key: 'nav.report' },
  { to: '/coach', key: 'nav.coach' },
  { to: '/profile', key: 'nav.profile' },
  { to: '/about', key: 'nav.about' },
]

const TABS = [
  { to: '/', key: 'nav.home' as TKey, icon: Home, end: true },
  { to: '/log', key: 'nav.logShort' as TKey, icon: PenLine },
  { to: '/report', key: 'nav.report' as TKey, icon: BarChart3 },
  { to: '/coach', key: 'nav.coach' as TKey, icon: MessageCircle },
  { to: '/profile', key: 'nav.profile' as TKey, icon: User },
]

const ABOUT_PATHS = ['/about', '/how-it-works', '/data', '/responsible-ai', '/impact', '/roadmap', '/team']

function Logo() {
  return (
    <Link to="/" className="flex min-h-11 items-center gap-2 text-xl font-bold text-olive-900" aria-label="EdiByte home">
      <span aria-hidden>🥗</span>
      <span lang="en">EdiByte</span>
    </Link>
  )
}

export function Layout() {
  const { t } = useApp()
  const tryDemo = useTryDemo()
  const { pathname } = useLocation()

  // Move focus/scroll to the top on page change (keyboard and screen-reader friendly).
  useEffect(() => {
    window.scrollTo(0, 0)
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:shadow-soft">
        {t('nav.skip')}
      </a>

      <header className="sticky top-0 z-30 border-b border-olive-100 bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
          <Logo />
          <nav aria-label={t('nav.main')} className="ml-4 hidden flex-1 items-center gap-1 lg:flex">
            {TOP_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => {
                  const active = isActive || (l.to === '/about' && ABOUT_PATHS.includes(pathname))
                  return `flex min-h-11 items-center rounded-xl px-3 font-semibold transition-colors ${
                    active ? 'bg-olive-100 text-olive-900' : 'text-muted hover:bg-olive-50 hover:text-olive-900'
                  }`
                }}
              >
                {t(l.key)}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline-flex">
              <ModeBadge />
            </span>
            <LanguageSwitcher compact />
            <Link
              to="/about"
              aria-label={t('nav.about')}
              className="grid size-11 place-items-center rounded-xl text-olive-700 hover:bg-olive-100 lg:hidden"
            >
              <Info aria-hidden />
            </Link>
            <span className="hidden lg:block">
              <Button onClick={tryDemo}>{t('nav.tryDemo')}</Button>
            </span>
          </div>
        </div>
        <StartupBanner />
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 outline-none sm:pt-8 lg:pb-12">
        <div className="mb-4 sm:hidden">
          <ModeBadge />
        </div>
        <Outlet />
      </main>

      <footer className="border-t border-olive-100 bg-olive-50 pb-24 lg:pb-0">
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-6 text-sm text-muted">
          <p className="font-semibold text-olive-900">{t('footer.disclaimer')}</p>
          <nav aria-label={t('nav.about')} className="flex flex-wrap gap-x-4 gap-y-1">
            <Link className="underline-offset-4 hover:underline" to="/how-it-works">{t('about.how')}</Link>
            <Link className="underline-offset-4 hover:underline" to="/data">{t('about.data')}</Link>
            <Link className="underline-offset-4 hover:underline" to="/responsible-ai">{t('about.rai')}</Link>
            <Link className="underline-offset-4 hover:underline" to="/impact">{t('about.impact')}</Link>
            <Link className="underline-offset-4 hover:underline" to="/roadmap">{t('about.roadmap')}</Link>
            <Link className="underline-offset-4 hover:underline" to="/team">{t('about.team')}</Link>
          </nav>
          <p>{t('footer.team')}</p>
        </div>
      </footer>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label={t('nav.main')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-olive-100 bg-white/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map(({ to, key, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                    isActive ? 'text-olive-700' : 'text-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`grid h-7 w-12 place-items-center rounded-full ${isActive ? 'bg-olive-100' : ''}`}>
                      <Icon size={20} aria-hidden />
                    </span>
                    {t(key)}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
