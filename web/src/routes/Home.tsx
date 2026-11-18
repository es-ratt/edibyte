import { Camera } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useT } from '@/app/store'
import { Card, PageTitle } from '@/components/ui'

// Phase 3 adds today's plan mini card, this-week habit dots and the weekly tip.
export default function Home() {
  const t = useT()
  return (
    <>
      <PageTitle>{t('route.home')}</PageTitle>
      <Card as="section" labelledBy="photo-card" className="bg-olive-700 text-white">
        <h2 id="photo-card" className="text-xl font-semibold">
          {t('home.photoTitle')}
        </h2>
        <p className="mt-1 text-white/90">{t('home.photoBody')}</p>
        <Link
          to="/capture"
          className="mt-4 inline-flex min-h-tap items-center gap-2 rounded-2xl bg-white px-5 font-semibold text-olive-900"
        >
          <Camera size={20} aria-hidden />
          {t('home.photoCta')}
        </Link>
      </Card>
    </>
  )
}
