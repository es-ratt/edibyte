import { useEffect, useState } from 'react'
import { BadgeCheck, CircleAlert } from 'lucide-react'
import { useAppStore, useT } from '@/app/store'
import { Card, Chip, PageTitle } from '@/components/ui'
import { api, type DataStatus } from '@/lib/api'
import { fmtNum } from '@/lib/i18n'

type Load = { state: 'loading' } | { state: 'ok'; data: DataStatus } | { state: 'error' }

// Phase 7 adds source dates, licences, "report a mistake" and validation results.
export default function DataSources() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const [load, setLoad] = useState<Load>({ state: 'loading' })

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
              {t('data.foods')}: {fmtNum(load.data.foods_total, lang)}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip icon={BadgeCheck} tone="olive">
                {t('data.verified')}: {fmtNum(load.data.foods_verified, lang)}
              </Chip>
              <Chip icon={CircleAlert} tone="amber">
                {t('data.unverified')}: {fmtNum(load.data.foods_total - load.data.foods_verified, lang)}
              </Chip>
            </div>
            <p className="mt-3 text-sm text-muted">{t('data.unverifiedNote')}</p>
          </Card>
          <Card as="section" labelledBy="data-sources">
            <h2 id="data-sources" className="mb-2 font-semibold text-olive-900">
              {t('data.sources')}
            </h2>
            <ul className="flex flex-col gap-2">
              {load.data.sources.map((s) => (
                <li key={s.source} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-ink">{s.source}</span>
                  <span className="shrink-0 text-muted">{t('data.rows', { n: fmtNum(s.rows, lang) })}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  )
}
