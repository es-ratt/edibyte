import { BookOpen, ShieldCheck, WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Source } from '@/types/api'
import { useApp } from '@/hooks/useApp'
import { Badge } from './Badge'

interface Props {
  role: 'user' | 'assistant'
  children: ReactNode
  sources?: Source[]
  offline?: boolean
  guardrail?: boolean
  error?: boolean
}

export function ChatBubble({ role, children, sources, offline, guardrail, error }: Props) {
  const { t } = useApp()
  const mine = role === 'user'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] sm:max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
        <span className="sr-only">{mine ? t('coach.you') : t('coach.bot')}:</span>
        {guardrail && (
          <Badge tone="warn">
            <ShieldCheck size={13} aria-hidden /> {t('coach.safety')}
          </Badge>
        )}
        <div
          className={`whitespace-pre-line rounded-2xl px-4 py-3 ${
            mine
              ? 'rounded-br-md bg-olive-700 text-white'
              : error
                ? 'rounded-bl-md border border-danger/30 bg-danger-50 text-danger'
                : 'rounded-bl-md border border-olive-100 bg-white text-ink shadow-soft'
          }`}
        >
          {children}
        </div>
        {!mine && (offline || (sources && sources.length > 0)) && (
          <div className="flex flex-wrap items-center gap-1.5" aria-label={t('coach.sources')}>
            {offline && (
              <Badge tone="neutral">
                <WifiOff size={12} aria-hidden /> {t('mode.offline')}
              </Badge>
            )}
            {sources && sources.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
                <BookOpen size={13} aria-hidden /> {t('coach.sources')}:
              </span>
            )}
            {sources?.map((s) => (
              <span
                key={`${s.type}:${s.id}`}
                title={s.source}
                className="inline-flex items-center gap-1 rounded-full border border-olive-200 bg-olive-50 px-2.5 py-0.5 text-xs text-olive-900"
              >
                {s.title}
                {!s.verified && <span className="font-semibold text-danger">· {t('badge.unverified')}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  const { t } = useApp()
  return (
    <div className="flex justify-start" role="status" aria-live="polite">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-olive-100 bg-white px-4 py-3 shadow-soft">
        <span className="sr-only">{t('coach.typing')}</span>
        {[0, 1, 2].map((i) => (
          <span key={i} aria-hidden className="typing-dot size-2 rounded-full bg-olive-600" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}
