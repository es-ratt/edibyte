import { AlertTriangle, Database } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card, CardTitle } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonCard } from '@/components/Skeleton'
import { errorKey, useApp } from '@/hooks/useApp'
import { foodName, servingDesc } from '@/lib/food'
import { fmtNum, type TKey } from '@/lib/i18n'
import { api } from '@/services/api'
import type { DataStatus, Food } from '@/types/api'

export default function Data() {
  const { t, lang } = useApp()
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [foods, setFoods] = useState<Food[]>([])
  const [error, setError] = useState<TKey | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setError(null)
    Promise.all([api.dataStatus(), api.foods('', 100)])
      .then(([s, f]) => (setStatus(s), setFoods(f)))
      .catch((e) => setError(errorKey(e)))
  }, [attempt])

  const n = (v: number) => fmtNum(v, lang)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t('data.title')} subtitle={t('data.subtitle')} />
      {error ? (
        <EmptyState tone="error" icon={<Database aria-hidden />} title={t(error)} action={<Button onClick={() => setAttempt((a) => a + 1)}>{t('common.retry')}</Button>} />
      ) : !status ? (
        <SkeletonCard lines={5} />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ['data.foods', status.foods_total],
                ['data.verified', status.foods_verified],
                ['data.withPrice', status.foods_with_price],
                ['data.tips', status.tips_total],
              ] as const
            ).map(([k, v]) => (
              <Card key={k} className="p-4 sm:p-4">
                <dt className="text-sm text-muted">{t(k)}</dt>
                <dd className="text-3xl font-bold text-olive-900">{n(v)}</dd>
              </Card>
            ))}
          </dl>

          {status.foods_verified < status.foods_total && (
            <div role="note" className="mt-5 flex items-start gap-3 rounded-2xl border border-mustard/50 bg-mustard-100 p-5">
              <AlertTriangle className="mt-0.5 shrink-0" aria-hidden />
              <div>
                <p className="font-bold text-ink">{t('data.warningTitle')}</p>
                <p className="text-ink">{t('data.warningText')}</p>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Card>
              <CardTitle>{t('data.sourcesTitle')}</CardTitle>
              <ul className="space-y-2">
                {status.sources.map((s) => (
                  <li key={s.source} className="flex items-start justify-between gap-3 rounded-xl bg-olive-50 px-3 py-2">
                    <span className="break-words text-ink">{s.source}</span>
                    <Badge tone="neutral">{t('data.rows', { n: n(s.rows) })}</Badge>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted">{t('data.licence')}</p>
            </Card>
            <Card>
              <CardTitle className="flex items-center gap-2">
                {t('data.plannedTitle')} <Badge tone="warn">{t('badge.planned')}</Badge>
              </CardTitle>
              <ul className="list-disc space-y-2 pl-5 text-muted">
                <li>{t('data.planned1')}</li>
                <li>{t('data.planned2')}</li>
              </ul>
              <p className="mt-3 rounded-xl bg-olive-50 p-3 font-mono text-xs text-olive-900">{t('data.howToReplace')}</p>
            </Card>
          </div>

          <Card className="mt-5">
            <CardTitle>{t('data.table')}</CardTitle>
            <div className="-mx-2 max-h-[32rem] overflow-auto">
              <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-left">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-sm text-muted">
                    <th scope="col" className="px-2 py-2">{t('data.colFood')}</th>
                    <th scope="col" className="px-2 py-2">{t('data.colServing')}</th>
                    <th scope="col" className="px-2 py-2 text-right">{t('data.colKcal')}</th>
                    <th scope="col" className="px-2 py-2 text-right">{t('data.colProtein')}</th>
                    <th scope="col" className="px-2 py-2">{t('data.colStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {foods.map((f) => (
                    <tr key={f.id}>
                      <th scope="row" className="border-t border-olive-100 px-2 py-2 font-semibold">{foodName(f, lang)}</th>
                      <td className="border-t border-olive-100 px-2 py-2 text-muted">
                        {servingDesc(f, lang)} · {n(f.serving_grams)} {t('common.g')}
                      </td>
                      <td className="border-t border-olive-100 px-2 py-2 text-right">{n(f.kcal)}</td>
                      <td className="border-t border-olive-100 px-2 py-2 text-right">{fmtNum(f.protein_g, lang, 1)}</td>
                      <td className="border-t border-olive-100 px-2 py-2">
                        {f.verified ? <Badge>{t('badge.verified')}</Badge> : <Badge tone="neutral" title={f.source}>{t('badge.unverified')}</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
