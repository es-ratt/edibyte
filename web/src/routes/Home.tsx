import { Camera, PauseCircle, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppStore, useMode, useT } from '@/app/store'
import { Card, Chip, PageTitle } from '@/components/ui'
import { SupportCard } from '@/features/safety/SafetyCards'

// Phase 3 adds today's plan mini card, this-week habit dots and the weekly tip.
export default function Home() {
  const t = useT()
  const mode = useMode()
  const flagged = useAppStore((s) => s.safety.wellbeingFlagged)

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <PageTitle>{t('home.hello')}</PageTitle>
        {mode.teen && (
          <Chip icon={ShieldCheck} tone="olive">
            {t('teen.chip')}
          </Chip>
        )}
      </div>

      {flagged && (
        <div className="mb-4">
          <SupportCard />
        </div>
      )}

      {mode.trackingHidden ? (
        <Card className="flex items-start gap-3">
          <PauseCircle size={22} aria-hidden className="mt-0.5 shrink-0 text-olive-700" />
          <p>{t('home.paused')}</p>
        </Card>
      ) : (
        <Card as="section" labelledBy="photo-card" tone="olive">
          <h2 id="photo-card" className="text-xl font-semibold">
            {t('home.photoTitle')}
          </h2>
          <p className="mt-1 text-white/90">{t('home.photoBody')}</p>
          <Link to="/capture" className="mt-4 inline-flex min-h-tap items-center gap-2 rounded-2xl bg-white px-5 font-semibold text-olive-900">
            <Camera size={20} aria-hidden />
            {t('home.photoCta')}
          </Link>
        </Card>
      )}
    </>
  )
}
