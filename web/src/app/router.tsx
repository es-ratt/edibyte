import { Component, lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, useLocation, type RouteObject } from 'react-router-dom'
import { Layout } from './Layout'
import { useAppStore, useT } from './store'
import Home from '@/routes/Home'
import Onboarding from '@/routes/Onboarding'
import Capture from '@/routes/Capture'
import { Placeholder } from '@/routes/Placeholder'
import Welcome from '@/routes/Welcome'

const Settings = lazy(() => import('@/routes/Settings'))
const DataSources = lazy(() => import('@/routes/DataSources'))
const Confirm = lazy(() => import('@/routes/Confirm'))
const Result = lazy(() => import('@/routes/Result'))
const Progress = lazy(() => import('@/routes/Progress'))
const Coach = lazy(() => import('@/routes/Coach'))
const Plans = lazy(() => import('@/routes/Plans'))

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

/** Route table, shared by the app's browser router and the accessibility tests. */
export const routes: RouteObject[] = [
    {
      element: <Layout />,
      children: [
        { path: '/welcome', element: page(<Welcome />) },
        { path: '/onboarding', element: gated(<Onboarding />) },
        { path: '/', element: gated(<Home />) },
        { path: '/capture', element: gated(<Capture />) },
        { path: '/confirm', element: gated(<Confirm />) },
        { path: '/result', element: gated(<Result />) },
        { path: '/coach', element: gated(<Coach />) },
        { path: '/progress', element: gated(<Progress />) },
        { path: '/plans', element: gated(<Plans />) },
        { path: '/settings', element: gated(<Settings />) },
        { path: '/data-sources', element: gated(<DataSources />) },
        { path: '*', element: page(<Placeholder titleKey="route.notFound" />) },
      ],
    },
]

export const router = createBrowserRouter(routes, { basename })
