import { Search } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { api } from '@/services/api'
import { useApp } from '@/hooks/useApp'
import { foodName, servingDesc, toBrief } from '@/lib/food'
import type { FoodBrief } from '@/types/api'
import { Badge } from './Badge'

interface Props {
  initialQuery?: string
  autoFocus?: boolean
  onSelect: (food: FoodBrief) => void
  onCancel?: () => void
}

/** Accessible search combobox over GET /foods?query= (debounced). */
export function FoodPicker({ initialQuery = '', autoFocus, onSelect, onCancel }: Props) {
  const { t, lang } = useApp()
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<FoodBrief[]>([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      api
        .foods(query.trim(), 8)
        .then((rows) => !cancelled && (setResults(rows.map(toBrief)), setActive(0)))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setLoading(false))
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const choose = (f: FoodBrief) => onSelect(f)

  return (
    <div className="relative">
      <label className="sr-only" htmlFor={`${listId}-input`}>
        {t('review.searchFood')}
      </label>
      <div className="flex items-center gap-2 rounded-xl border-2 border-olive-200 bg-white px-3 focus-within:border-olive-600">
        <Search size={18} className="shrink-0 text-muted" aria-hidden />
        <input
          id={`${listId}-input`}
          ref={inputRef}
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
          className="min-h-11 w-full bg-transparent outline-none placeholder:text-muted"
          placeholder={t('review.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') (e.preventDefault(), setActive((a) => Math.min(a + 1, results.length - 1)))
            else if (e.key === 'ArrowUp') (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)))
            else if (e.key === 'Enter' && results[active]) (e.preventDefault(), choose(results[active]))
            else if (e.key === 'Escape') onCancel?.()
          }}
        />
      </div>
      <ul id={listId} role="listbox" aria-label={t('review.searchFood')} className="mt-1 max-h-64 overflow-auto rounded-xl border border-olive-100 bg-white shadow-soft empty:hidden">
        {results.map((f, i) => (
          <li
            key={f.id}
            id={`${listId}-${f.id}`}
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onMouseDown={(e) => (e.preventDefault(), choose(f))}
            className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 px-3 py-2 ${i === active ? 'bg-olive-100' : ''}`}
          >
            <span>
              <span className="font-semibold">{foodName(f, lang)}</span>
              <span className="ml-2 text-sm text-muted">{servingDesc(f, lang)}</span>
            </span>
            {!f.verified && <Badge tone="neutral">{t('badge.unverified')}</Badge>}
          </li>
        ))}
      </ul>
      {!loading && results.length === 0 && query.trim() && (
        <p className="mt-1 px-1 text-sm text-muted" role="status">
          {t('review.noResults')}
        </p>
      )}
    </div>
  )
}
