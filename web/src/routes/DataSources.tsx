import { useEffect, useState } from 'react'
import { BadgeCheck, CircleAlert, ExternalLink, FlaskConical, Hourglass, Lock, MessageSquareWarning } from 'lucide-react'
import { useAppStore, useT } from '@/app/store'
import { Card, Chip, PageTitle } from '@/components/ui'
import { api, type DataStatus } from '@/lib/api'
import { fmtNum, type TKey } from '@/lib/i18n'

type Load = { state: 'loading' } | { state: 'ok'; data: DataStatus } | { state: 'error' }

const REPORT_URL = 'https://github.com/es-ratt/edibyte/issues/new?labels=data&title=Data%20mistake%3A%20'
const PRIVACY: TKey[] = ['priv.phone', 'priv.sent', 'priv.photo', 'priv.logs', 'priv.delete']

export default function DataSources() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const n = (x: number) => fmtNum(x, lang)

  useEffect(() => {
    let active = true
    api
      .dataStatus()
      .then((data) => active && setLoad({ state: 'ok', data }))
      .catch(() => active && setLoad({ state: 'error' }))
    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <PageTitle>{t('route.data')}</PageTitle>
      <p className="mb-4 text-muted">{t('data.intro')}</p>
      {load.state === 'loading' && <p role="status">{t('common.loading')}</p>}
      {load.state === 'error' && <p role="alert">{t('common.error')}</p>}
      {load.state === 'ok' && (
        <div className="flex flex-col gap-4">
          <Card as="section" labelledBy="data-foods">
            <h2 id="data-foods" className="font-semibold text-olive-900">
              {t('data.foods')}: {n(load.data.foods_total)}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip icon={BadgeCheck} tone="olive">
                {t('data.verified')}: {n(load.data.foods_verified)}
              </Chip>
              <Chip icon={CircleAlert} tone="amber">
                {t('data.unverified')}: {n(load.data.foods_total - load.data.foods_verified)}
              </Chip>
            </div>
            <ul className="mt-3 text-sm">
              {Object.entries(load.data.food_methods).map(([k, m]) => (
                <li key={k}>{t('data.method', { m: n(m), k })}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">{t('data.methodNote')}</p>
            <p className="mt-2 text-sm text-muted">{t('data.unverifiedNote')}</p>
            <h3 className="mb-1 mt-3 text-sm font-semibold text-olive-900">{t('data.sources')}</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {load.data.sources.map((s) => (
                <li key={s.source} className="flex items-start justify-between gap-3">
                  <span className="text-ink">{s.source}</span>
                  <span className="shrink-0 text-muted">{t('data.rows', { n: n(s.rows) })}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card as="section" labelledBy="data-refs">
            <h2 id="data-refs" className="font-semibold text-olive-900">
              {t('data.references')}
            </h2>
            <p className="mt-1 flex flex-wrap gap-2">
              <Chip icon={BadgeCheck} tone="olive">
                {t('data.refCounts', { s: n(load.data.references.sourced), p: n(load.data.references.pending) })}
              </Chip>
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {load.data.references.rows.map((r) => (
                <li key={`${r.nutrient}-${r.group}`} className="border-b border-line pb-2 text-sm last:border-0">
                  <span className="block font-medium">{t(`nut.${r.nutrient}` as TKey)}</span>
                  <span className="block text-muted">
                    {t('data.ages', { g: r.group.replace('0-200 any', 'all').replace('-200', '+').replace(' any', '') })}
                    {r.date ? ` · ${t('data.checkedOn', { d: r.date })}` : ''}
                  </span>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 font-semibold text-olive-700 underline underline-offset-4">
                      {r.source.split(':')[0]}
                      <ExternalLink size={14} aria-hidden />
                    </a>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              <Hourglass size={16} aria-hidden />
              {t('data.weeklyTips', { t: n(load.data.weekly_tips.total), r: n(load.data.weekly_tips.reviewed) })}
            </p>
          </Card>

          <Card as="section" labelledBy="data-acc" tone="mustard">
            <h2 id="data-acc" className="mb-1 flex items-center gap-2 font-semibold text-olive-900">
              <FlaskConical size={18} aria-hidden />
              {t('data.accuracy')}
            </h2>
            <p>{t('data.accuracyNone')}</p>
          </Card>

          <Card as="section" labelledBy="data-priv">
            <h2 id="data-priv" className="mb-2 flex items-center gap-2 font-semibold text-olive-900">
              <Lock size={18} aria-hidden />
              {t('priv.title')}
            </h2>
            <ul className="flex list-disc flex-col gap-1 ps-5 text-sm">
              {PRIVACY.map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ul>
          </Card>

          <Card as="section" labelledBy="data-report">
            <a id="data-report" href={REPORT_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center gap-2 font-semibold text-olive-700 underline underline-offset-4">
              <MessageSquareWarning size={18} aria-hidden />
              {t('data.report')}
            </a>
            <p className="mt-1 text-sm text-muted">{t('data.reportNote')}</p>
          </Card>
        </div>
      )}
    </>
  )
}
