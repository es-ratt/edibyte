import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { SkeletonCard } from '@/components/Skeleton'
import { AppProvider } from '@/hooks/useApp'
import { AuthProvider } from '@/hooks/useAuth'
import Home from '@/pages/Home'
import LogMeal from '@/pages/LogMeal'

// Core flow pages load eagerly; the rest are split out to keep the first load small.
const Report = lazy(() => import('@/pages/Report'))
const Coach = lazy(() => import('@/pages/Coach'))
const Profile = lazy(() => import('@/pages/Profile'))
const About = lazy(() => import('@/pages/About'))
const HowItWorks = lazy(() => import('@/pages/HowItWorks'))
const Data = lazy(() => import('@/pages/Data'))
const ResponsibleAI = lazy(() => import('@/pages/ResponsibleAI'))
const Impact = lazy(() => import('@/pages/Impact'))
const Roadmap = lazy(() => import('@/pages/Roadmap'))
const Team = lazy(() => import('@/pages/Team'))
const Login = lazy(() => import('@/pages/Login'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const page = (el: React.ReactNode) => <Suspense fallback={<SkeletonCard lines={4} />}>{el}</Suspense>

// BASE_URL is '/' locally and '/edibyte/' on GitHub Pages (vite build --base=/edibyte/).
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/log', element: <LogMeal /> },
      { path: '/report', element: page(<Report />) },
      { path: '/coach', element: page(<Coach />) },
      { path: '/profile', element: page(<Profile />) },
      { path: '/about', element: page(<About />) },
      { path: '/how-it-works', element: page(<HowItWorks />) },
      { path: '/data', element: page(<Data />) },
      { path: '/responsible-ai', element: page(<ResponsibleAI />) },
      { path: '/impact', element: page(<Impact />) },
      { path: '/roadmap', element: page(<Roadmap />) },
      { path: '/team', element: page(<Team />) },
      { path: '/login', element: page(<Login />) },
      { path: '*', element: page(<NotFound />) },
    ],
  },
], { basename })

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </AppProvider>
  )
}
