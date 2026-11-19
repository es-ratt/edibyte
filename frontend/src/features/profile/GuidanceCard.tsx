import { useEffect, useState } from 'react'
import { BadgeCheck, Hourglass, ExternalLink } from 'lucide-react'
import { useAppStore, useT } from '@/app/store'
import { Card, Chip } from '@/components/ui'
import { api } from '@/lib/api'
import { fmtNum, type TKey } from '@/lib/i18n'
import type { ReferenceItem } from '@/lib/targets'
import { summarize, type Profile } from './model'

type Props = { profile: Profile }

const KNOWN_NUTRIENTS = new Set([
  'free_sugars', 'saturated_fat', 'trans_fat', 'fruit_veg', 'total_fat', 'sodium',
  'energy', 'protein', 'fibre', 'iron', 'zinc', 'calcium',
]) // fmt: skip

function phraseKey(item: ReferenceItem): TKey | null {
  if (item.unit === '% of daily energy' && item.type === 'limit') return 'ref.limitPctEnergy'
  if (item.unit === 'g per day' && item.type === 'limit') return 'ref.limitGDay'
  if (item.unit === 'g per day' && item.type === 'target') return 'ref.targetGDay'
  return null
}

/** Sourced reference values for this profile, each with its source; everything else "pending". */
export function GuidanceCard({ profile }: Props) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const [items, setItems] = useState<ReferenceItem[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    api
      .referenceTargets(summarize(profile))
      .then((r) => active && setItems(r.items.filter((i) => KNOWN_NUTRIENTS.has(i.nutrient))))
      .catch(() => active && setFailed(true))
    return () => {
      active = false
    }
  }, [profile])

  const sourced = items?.filter((i) => i.status === 'sourced') ?? []
  const pending = items?.filter((i) => i.status === 'unavailable') ?? []

  return (
    <Card as="section" labelledBy="guidance-title">
      <h2 id="guidance-title" className="mb-1 font-semibold text-olive-900">
        {t('set.targets')}
      </h2>
      <p className="mb-3 text-sm text-muted">{t('set.targetsIntro')}</p>
      {failed && <p role="alert">{t('common.error')}</p>}
      {!items && !failed && <p role="status">{t('common.loading')}</p>}
      {sourced.length > 0 && (
        <ul className="flex flex-col gap-3">
          {sourced.map((i) => {
            const key = phraseKey(i)
            return (
              <li key={i.nutrient} className="flex flex-col gap-1 border-b border-line pb-3 last:border-0">
                <span className="font-medium text-ink">{t(`nut.${i.nutrient}` as TKey)}</span>
                {key && <span className={i.type === 'limit' ? 'text-amber-ink' : 'text-olive-900'}>{t(key, { v: fmtNum(i.value ?? 0, lang) })}</span>}
                <span className="flex flex-wrap items-center gap-2">
                  <Chip icon={BadgeCheck} tone="olive">
                    {i.source.startsWith('WHO') ? t('src.who') : t('set.sourceLink')}
                  </Chip>
                  {i.url && (
                    <a href={i.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-olive-700 underline underline-offset-4">
                      {t('set.sourceLink')}
                      <ExternalLink size={14} aria-hidden />
                    </a>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {pending.length > 0 && (
        <div className="mt-3">
          <Chip icon={Hourglass} tone="amber">
            {t('set.pending')}
          </Chip>
          <p className="mt-2 text-sm text-muted">{pending.map((i) => t(`nut.${i.nutrient}` as TKey)).join(', ')}</p>
        </div>
      )}
    </Card>
  )
}
