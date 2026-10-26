import type { ReactNode } from 'react'

type Tone = 'olive' | 'warn' | 'danger' | 'neutral'
const tones: Record<Tone, string> = {
  olive: 'bg-olive-100 text-olive-900 border-olive-200',
  warn: 'bg-mustard-100 text-ink border-mustard/50',
  danger: 'bg-danger-50 text-danger border-danger/30',
  neutral: 'bg-white text-muted border-olive-200',
}

export function Badge({ tone = 'olive', children, className = '', title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}
