import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  title: string
  text?: string
  action?: ReactNode
  tone?: 'neutral' | 'error'
}

/** Friendly empty or error state with an optional call to action. */
export function EmptyState({ icon, title, text, action, tone = 'neutral' }: Props) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={`flex flex-col items-center rounded-2xl border border-dashed px-6 py-10 text-center ${
        tone === 'error' ? 'border-danger/40 bg-danger-50' : 'border-olive-200 bg-olive-50'
      }`}
    >
      <div className={`mb-3 grid size-14 place-items-center rounded-full ${tone === 'error' ? 'bg-white text-danger' : 'bg-white text-olive-700'}`}>
        {icon}
      </div>
      <p className="text-lg font-semibold text-olive-900">{title}</p>
      {text && <p className="mt-1 max-w-md text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
