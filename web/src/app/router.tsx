import { Component, lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom'
import { Layout } from './Layout'
import { useAppStore, useT } from './store'
import Home from '@/routes/Home'
import Onboarding from '@/routes/Onboarding'
import { Placeholder } from '@/routes/Placeholder'
import Welcome from '@/routes/Welcome'

const Settings = lazy(() => import('@/routes/Settings'))
const DataSources = lazy(() => import('@/routes/DataSources'))

function Loading() {
  const t = useT()
  return <p role="status" className="py-8 text-center text-muted">{t('common.loading')}</p>
}

function ErrorView() {
  const t = useT()
  return <p role="alert" className="py-8 text-center">{t('common.error')}</p>
}

type BoundaryProps = { children: ReactNode }
type BoundaryState = { failed: boolean }

/** Error boundaries must be class components (React 19 has no hook equivalent). */
class RouteBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  render(): ReactNode {
    return this.state.failed ? <ErrorView /> : this.props.children
  }
}

const page = (el: ReactNode) => (
  <RouteBoundary>
    <Suspense fallback={<Loading />}>{el}</Suspense>
  </RouteBoundary>
)

/** Reachable without a profile (so "delete all" and the data page always work). */
const NO_PROFILE_ROUTES = ['/onboarding', '/settings', '/data-sources']

/** First run goes to /welcome; then everything except NO_PROFILE_ROUTES needs a profile. */
function FirstRunGate({ children }: BoundaryProps) {
  const welcomed = useAppStore((s) => s.welcomed)
  const hasProfile = useAppStore((s) => s.profile !== null)
  const { pathname } = useLocation()
  if (!welcomed && pathname !== '/welcome') return <Navigate to="/welcome" replace />
  if (welcomed && !hasProfile && !NO_PROFILE_ROUTES.includes(pathname)) return <Navigate to="/onboarding" replace />
  return children
}

const gated = (el: ReactNode) => <FirstRunGate>{page(el)}</FirstRunGate>

// BASE_URL is '/' locally and '/edibyte/' on GitHub Pages.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export const ROUTE_PATHS = [
  '/welcome', '/onboarding', '/', '/capture', '/confirm', '/result', '/coach',
  '/progress', '/plans', '/settings', '/data-sources',
] as const // fmt: skip

export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { path: '/welcome', element: page(<Welcome />) },
        { path: '/onboarding', element: gated(<Onboarding />) },
        { path: '/', element: gated(<Home />) },
        { path: '/capture', element: gated(<Placeholder titleKey="route.capture" />) },
        { path: '/confirm', element: gated(<Placeholder titleKey="route.confirm" />) },
        { path: '/result', element: gated(<Placeholder titleKey="route.result" />) },
        { path: '/coach', element: gated(<Placeholder titleKey="route.coach" />) },
        { path: '/progress', element: gated(<Placeholder titleKey="route.progress" />) },
        { path: '/plans', element: gated(<Placeholder titleKey="route.plans" />) },
        { path: '/settings', element: gated(<Settings />) },
        { path: '/data-sources', element: gated(<DataSources />) },
        { path: '*', element: page(<Placeholder titleKey="route.notFound" />) },
      ],
    },
  ],
  { basename },
)
