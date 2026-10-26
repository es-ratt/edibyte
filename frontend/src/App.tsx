import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { SkeletonCard } from '@/components/Skeleton'
import { AppProvider } from '@/hooks/useApp'
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
const NotFound = lazy(() => import('@/pages/NotFound'))

const page = (el: React.ReactNode) => <Suspense fallback={<SkeletonCard lines={4} />}>{el}</Suspense>

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
      { path: '*', element: page(<NotFound />) },
    ],
  },
])

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  )
}
