import { FlaskConical, Target } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/Badge'
import { Card, CardTitle } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonCard } from '@/components/Skeleton'
import { useApp } from '@/hooks/useApp'
import { fmtNum, type TKey } from '@/lib/i18n'
import { api } from '@/services/api'
import type { EvalResults, EvalSummary } from '@/types/api'

const KPIS: TKey[] = ['impact.k1', 'impact.k2', 'impact.k3', 'impact.k4']

export default function Impact() {
  const { t, lang } = useApp()
  const [results, setResults] = useState<EvalResults | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    api.evalResults().then(setResults).catch(() => setFailed(true))
  }, [])

  const pct = (v: number) => `${fmtNum(Math.round(v * 1000) / 10, lang, 1)}%`
  const metrics = (s: EvalSummary) =>
    (
      [
        ['impact.precision', s.precision],
        ['impact.recall', s.recall],
        ['impact.f1', s.f1],
        ['impact.exact', s.exact_match_rate],
      ] as const
    ).map(([k, v]) => ({ k, v }))

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t('impact.title')} />
      <Card className="mb-5">
        <CardTitle>{t('impact.why')}</CardTitle>
        <p className="text-muted">{t('impact.whyText')}</p>
      </Card>

      <section aria-labelledby="kpi" className="mb-5">
        <Card>
          <h2 id="kpi" className="mb-1 flex items-center gap-2 text-lg">
            <Target size={20} className="text-olive-600" aria-hidden /> {t('impact.targetsTitle')}
          </h2>
          <p className="mb-4 text-sm font-semibold text-muted">{t('impact.targetsNote')}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {KPIS.map((k) => (
              <li key={k} className="flex items-start justify-between gap-3 rounded-xl border border-dashed border-olive-200 bg-olive-50 p-4">
                <span className="text-ink">{t(k)}</span>
                <Badge tone="warn">{t('badge.target')}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section aria-labelledby="measured">
        <Card>
          <h2 id="measured" className="mb-3 flex items-center gap-2 text-lg">
            <FlaskConical size={20} className="text-olive-600" aria-hidden /> {t('impact.measuredTitle')}
          </h2>
          {failed || results?.status === 'not_run' ? (
            <div className="rounded-xl bg-olive-50 p-5">
              <p className="text-2xl font-bold text-olive-900">{t('impact.notRun')}</p>
              <p className="mt-1 font-mono text-sm text-muted">{t('impact.notRunHelp')}</p>
            </div>
          ) : !results ? (
            <SkeletonCard lines={2} />
          ) : (
            <>
              <p className="mb-4 text-sm text-muted">
                {t('impact.runAt', { t: new Date(results.timestamp).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB'), mode: results.mode })}
              </p>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {metrics(results.overall).map(({ k, v }) => (
                  <div key={k} className="rounded-xl bg-olive-50 p-4">
                    <dt className="text-sm text-muted">{t(k)}</dt>
                    <dd className="text-2xl font-bold text-olive-900">{pct(v)}</dd>
                  </div>
                ))}
              </dl>
              <h3 className="mb-2 mt-5 text-base">{t('impact.byLang')}</h3>
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[30rem] text-left">
                  <thead>
                    <tr className="text-sm text-muted">
                      <th scope="col" className="px-2 py-1" />
                      <th scope="col" className="px-2 py-1">{t('impact.meals')}</th>
                      <th scope="col" className="px-2 py-1">{t('impact.precision')}</th>
                      <th scope="col" className="px-2 py-1">{t('impact.recall')}</th>
                      <th scope="col" className="px-2 py-1">{t('impact.exact')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(results.by_lang).map(([l, s]) => (
                      <tr key={l} className="border-t border-olive-100">
                        <th scope="row" className="px-2 py-2 font-semibold">{t(`impact.lang.${l}` as TKey)}</th>
                        <td className="px-2 py-2">{fmtNum(s.meals, lang)}</td>
                        <td className="px-2 py-2">{pct(s.precision)}</td>
                        <td className="px-2 py-2">{pct(s.recall)}</td>
                        <td className="px-2 py-2">{pct(s.exact_match_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p role="note" className="mt-4 rounded-xl border border-mustard/50 bg-mustard-100 p-4 text-sm text-ink">
                {t('impact.evalNote', { n: fmtNum(results.overall.meals, lang) })} {t('impact.whatItMeasures')}
              </p>
            </>
          )}
        </Card>
      </section>
    </div>
  )
}
