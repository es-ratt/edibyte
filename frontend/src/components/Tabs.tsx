import { useRef, type KeyboardEvent } from 'react'

type Tab<T extends string> = { id: T; label: string }
type Props<T extends string> = { label: string; tabs: Tab<T>[]; value: T; onChange: (id: T) => void; idPrefix: string }

/** Segmented tabs (WAI-ARIA tabs pattern): arrow keys move, only the active tab is in the tab order. */
export function Tabs<T extends string>({ label, tabs, value, onChange, idPrefix }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const handleKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const next = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length
    onChange(tabs[next].id)
    refs.current[next]?.focus()
  }
  return (
    <div role="tablist" aria-label={label} className="mb-4 grid rounded-2xl bg-olive-50 p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${tab.id}`}
          aria-selected={value === tab.id}
          aria-controls={`${idPrefix}-panel-${tab.id}`}
          tabIndex={value === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(e) => handleKey(e, i)}
          className={`min-h-tap rounded-xl font-semibold ${value === tab.id ? 'bg-surface text-olive-900 shadow-card' : 'text-muted'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
