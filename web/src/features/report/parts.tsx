import { BadgeCheck, CircleAlert, CircleCheck, CircleDashed, ExternalLink, Lightbulb, type LucideIcon } from 'lucide-react'
import { useAppStore, useT } from '@/app/store'
import { Card, Chip } from '@/components/ui'
import type { CheckResponse, Confidence, NutrientLine } from '@/lib/check/types'
import { fmtNum, type TKey } from '@/lib/i18n'

const LEVEL_KEY: Record<CheckResponse['verdict']['level'], TKey> = { fits: 'res.fits', mostly: 'res.mostly', change: 'res.change' }
const REASON_ICON: Record<'good' | 'tip' | 'warn', { icon: LucideIcon; cls: string }> = {
  good: { icon: CircleCheck, cls: 'text-olive-700' },
  tip: { icon: Lightbulb, cls: 'text-amber-ink' },
  // Diet conflicts are not medical: amber, not terracotta.
  warn: { icon: CircleAlert, cls: 'text-amber-ink' },
}

export function VerdictCard({ verdict }: { verdict: CheckResponse['verdict'] }) {
  const t = useT()
  const tone = verdict.level === 'fits' ? 'tint' : 'mustard'
  return (
    <Card as="section" labelledBy="verdict-title" tone={tone}>
      <h2 id="verdict-title" className="text-xl font-semibold text-olive-900">
        {t(LEVEL_KEY[verdict.level])}
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {verdict.reasons.map((r) => {
          const { icon: Icon, cls } = REASON_ICON[r.kind]
          return (
            <li key={r.code} className="flex gap-2">
              <Icon size={20} aria-hidden className={`mt-0.5 shrink-0 ${cls}`} />
              <span>{t(`why.${r.code}` as TKey)}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

const PLATE_ORDER: (keyof CheckResponse['plate'])[] = ['grain', 'protein_food', 'veg_fruit', 'dairy']

export function PlateBalance({ plate }: { plate: CheckResponse['plate'] }) {
  const t = useT()
  return (
    <Card as="section" labelledBy="plate-title">
      <h2 id="plate-title" className="mb-3 font-semibold text-olive-900">
        {t('plate.title')}
      </h2>
      <ul className="grid grid-cols-2 gap-2">
        {PLATE_ORDER.map((k) => (
          <li key={k} className={`flex items-center gap-2 rounded-2xl border p-3 ${plate[k] ? 'border-olive-200 bg-olive-50' : 'border-dashed border-line'}`}>
            {plate[k] ? <CircleCheck size={20} aria-hidden className="text-olive-700" /> : <CircleDashed size={20} aria-hidden className="text-muted" />}
            <span>
              <span className="block text-sm font-semibold">{t(`plate.${k}` as TKey)}</span>
              <span className="block text-xs text-muted">{t(plate[k] ? 'plate.yes' : 'plate.no')}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Range bar: band from low to high, marker at the estimate. Limits use amber outline, never red. */
export function RangeBar({ low, value, high, max, limit = false }: { low: number; value: number; high: number; max: number; limit?: boolean }) {
  const pct = (x: number) => `${Math.min(100, (100 * x) / (max || 1))}%`
  const band = limit ? 'bg-mustard-100 border border-amber-ink' : 'bg-olive-100 border border-olive-500'
  return (
    <div className="relative mt-2 h-3 rounded-full bg-cream ring-1 ring-line" aria-hidden>
      <div className={`absolute inset-y-0 rounded-full ${band}`} style={{ left: pct(low), width: `calc(${pct(high)} - ${pct(low)})` }} />
      <div className={`absolute -top-1 h-5 w-1 rounded-full ${limit ? 'bg-amber-ink' : 'bg-olive-900'}`} style={{ left: pct(value) }} />
    </div>
  )
}

const CONF_KEY: Record<Confidence, TKey> = { high: 'conf.high', medium: 'conf.medium', low: 'conf.low' }

export function ConfidenceChip({ level }: { level: Confidence }) {
  const t = useT()
  return (
    <Chip icon={level === 'high' ? BadgeCheck : CircleAlert} tone={level === 'high' ? 'olive' : 'amber'}>
      {t(CONF_KEY[level])}
    </Chip>
  )
}

type LineProps = { line: NutrientLine; kind: 'target' | 'limit'; confidence: Confidence; verified: boolean; hideNumbers: boolean }

export function NutrientRow({ line, kind, confidence, verified, hideNumbers }: LineProps) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const n = (x: number) => fmtNum(x, lang, 1)
  const name = t(`nut.${line.nutrient}` as TKey)
  const unit = line.unit === 'mg' ? 'mg' : t('unit.g')

  let status: string
  if (line.value === null) status = t('res.noData')
  else if (kind === 'target') status = line.pct_of_target !== null ? t('res.pctTarget', { p: fmtNum(line.pct_of_target, lang) }) : t('res.targetPending')
  else if (line.share_of_meal_energy_pct !== null && line.limit_value !== null)
    status = hideNumbers
      ? t(line.status === 'above' ? 'res.wordsMore' : 'res.wordsOk')
      : t('res.shareEnergy', { p: fmtNum(line.share_of_meal_energy_pct, lang), w: fmtNum(line.limit_value, lang) })
  else if (line.pct_of_limit !== null) status = t('res.pctLimit', { p: fmtNum(line.pct_of_limit, lang) })
  else if (!line.complete) status = t('res.partial')
  else status = t('res.limitPending')

  return (
    <li className="border-b border-line py-3 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-ink">{name}</span>
        {line.value !== null && !hideNumbers && (
          <span className="text-sm text-ink">
            {t('res.amount', { v: n(line.value), u: unit, lo: n(line.low ?? 0), hi: n(line.high ?? 0) })}
          </span>
        )}
      </div>
      {line.value !== null && line.low !== null && line.high !== null && (
        <RangeBar low={line.low} value={line.value} high={line.high} max={line.high * 1.15} limit={kind === 'limit'} />
      )}
      <p className={`mt-2 text-sm ${kind === 'limit' && line.status === 'above' ? 'font-semibold text-amber-ink' : 'text-muted'}`}>{status}</p>
      {line.value !== null && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ConfidenceChip level={confidence} />
          <Chip icon={verified ? BadgeCheck : CircleAlert} tone={verified ? 'olive' : 'amber'}>
            {t(verified ? 'src.verified' : 'src.unverified')}
          </Chip>
          {kind === 'limit' && line.limit_source_url && line.limit_status === 'sourced' && (
            <a href={line.limit_source_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-olive-700 underline underline-offset-4">
              {t('src.who')}
              <ExternalLink size={14} aria-hidden />
            </a>
          )}
        </div>
      )}
    </li>
  )
}
