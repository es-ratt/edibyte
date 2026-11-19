import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { useAppStore, useT } from '@/app/store'
import { inputClass } from '@/components/form'
import { foodName, FoodIcon } from '@/features/report/food'
import { api } from '@/lib/api'
import type { FoodBrief } from '@/lib/check/types'

type Props = { onPick: (f: FoodBrief) => void; autoFocus?: boolean }

/** Debounced food search over the food table (live API or the demo CSV). */
export function FoodSearch({ onPick, autoFocus = false }: Props) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<FoodBrief[] | null>(null)

  useEffect(() => {
    if (!q.trim()) {
      setHits(null)
      return
    }
    let active = true
    const id = setTimeout(() => {
      api
        .searchFoods(q, lang)
        .then((r) => active && setHits(r))
        .catch(() => active && setHits([]))
    }, 250)
    return () => {
      active = false
      clearTimeout(id)
    }
  }, [q, lang])

  return (
    <div>
      <label htmlFor="food-search" className="sr-only">
        {t('conf.search')}
      </label>
      <div className="relative">
        <Search size={18} aria-hidden className="absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
        <input id="food-search" className={`${inputClass} ps-11`} placeholder={t('conf.search')} value={q} onChange={(e) => setQ(e.target.value)} autoFocus={autoFocus} />
      </div>
      {hits && hits.length === 0 && <p className="mt-2 text-sm text-muted">{t('conf.noResults')}</p>}
      {hits && hits.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {hits.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className="flex min-h-tap w-full items-center gap-3 rounded-2xl px-2 text-start hover:bg-olive-50"
                onClick={() => {
                  onPick(f)
                  setQ('')
                }}
              >
                <FoodIcon category={f.category} size={18} />
                <span>{foodName(f, lang)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
