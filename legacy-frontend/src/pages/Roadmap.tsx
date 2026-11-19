import { Briefcase, CircleDashed, ToggleLeft } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { Card, CardTitle } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { useApp } from '@/hooks/useApp'
import type { TKey } from '@/lib/i18n'

const ITEMS: { key: TKey; flag?: boolean }[] = [
  { key: 'roadmap.r1' },
  { key: 'roadmap.r2' },
  { key: 'roadmap.r3', flag: true },
  { key: 'roadmap.r4' },
  { key: 'roadmap.r5' },
  { key: 'roadmap.r6' },
  { key: 'roadmap.r7' },
]
const BIZ: TKey[] = ['roadmap.biz1', 'roadmap.biz2', 'roadmap.biz3', 'roadmap.biz4']

export default function Roadmap() {
  const { t } = useApp()
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t('roadmap.title')} subtitle={t('roadmap.subtitle')} />
      <Card>
        <ul className="space-y-3">
          {ITEMS.map((i) => (
            <li key={i.key} className="flex items-start gap-3 rounded-xl border border-olive-100 p-4">
              {i.flag ? <ToggleLeft className="mt-0.5 shrink-0 text-olive-600" aria-hidden /> : <CircleDashed className="mt-0.5 shrink-0 text-muted" aria-hidden />}
              <span className="flex-1 text-ink">{t(i.key)}</span>
              <Badge tone={i.flag ? 'olive' : 'warn'}>{i.flag ? t('roadmap.inFlag') : t('badge.planned')}</Badge>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="mt-5">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Briefcase size={20} className="text-olive-600" aria-hidden /> {t('roadmap.bizTitle')} <Badge tone="warn">{t('badge.planned')}</Badge>
        </CardTitle>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          {BIZ.map((k) => (
            <li key={k}>{t(k)}</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
