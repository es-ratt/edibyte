import { CloudOff, Loader2 } from 'lucide-react'
import { useApp } from '@/hooks/useApp'
import { USE_MOCK } from '@/services/api'
import { Button } from './Button'

/** Friendly cold-start / offline-server notice under the top bar. */
export function StartupBanner() {
  const { health, recheckHealth, t } = useApp()
  if (USE_MOCK) {
    return (
      <div role="status" className="border-b border-mustard/40 bg-mustard-100 px-4 py-2 text-center text-sm font-semibold text-ink">
        {t('mock.banner')}
      </div>
    )
  }
  if (health === 'waking') {
    return (
      <div role="status" aria-live="polite" className="border-b border-olive-200 bg-olive-100 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Loader2 className="shrink-0 animate-spin text-olive-700" aria-hidden />
          <div>
            <p className="font-semibold text-olive-900">{t('startup.waking')}</p>
            <p className="text-sm text-muted">{t('startup.wakingSub')}</p>
          </div>
        </div>
      </div>
    )
  }
  if (health === 'down') {
    return (
      <div role="alert" className="border-b border-danger/30 bg-danger-50 px-4 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <CloudOff className="shrink-0 text-danger" aria-hidden />
          <p className="flex-1 font-semibold text-danger">{t('startup.down')}</p>
          <Button variant="outline" onClick={recheckHealth}>
            {t('common.retry')}
          </Button>
        </div>
      </div>
    )
  }
  return null
}
