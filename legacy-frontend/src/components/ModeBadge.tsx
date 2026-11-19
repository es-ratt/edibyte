import { Sparkles, WifiOff } from 'lucide-react'
import { useApp } from '@/hooks/useApp'

/** Small badge showing whether the backend runs in AI or offline mode. */
export function ModeBadge() {
  const { healthData, health, t } = useApp()
  if (health !== 'ready' || !healthData) return null
  const ai = healthData.mode === 'ai'
  return (
    <span
      title={t(ai ? 'mode.aiHint' : 'mode.offlineHint')}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        ai ? 'border-olive-200 bg-olive-100 text-olive-900' : 'border-mustard/50 bg-mustard-100 text-ink'
      }`}
    >
      {ai ? <Sparkles size={14} aria-hidden /> : <WifiOff size={14} aria-hidden />}
      {t(ai ? 'mode.ai' : 'mode.offline')}
      <span className="sr-only">: {t(ai ? 'mode.aiHint' : 'mode.offlineHint')}</span>
    </span>
  )
}
