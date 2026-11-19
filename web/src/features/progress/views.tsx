import { useEffect, useState } from 'react'
import { BadgeCheck, CircleAlert, CupSoda, Drumstick, ExternalLink, Flame, Leaf, Lightbulb, Sparkles } from 'lucide-react'
import { useAppStore, useT } from '@/app/store'
import { Card, Chip } from '@/components/ui'
import { api } from '@/lib/api'
import { fmtNum, htmlLang, type Lang, type TKey } from '@/lib/i18n'
import { addDays, dayKey, milestones, summarizeWeek, toHabitSummary, weeksOfMonth, yearTiles, type MealFlags, type WeekSummary } from '@/lib/progress/habits'
import type { SuggestionResult } from '@/lib/progress/suggest'

const locale = (lang: Lang) => (htmlLang(lang) === 'bn' ? 'bn-BD' : 'en-GB')

/** Plain bar: share of a whole. Never red, never a "score". */
function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, (100 * value) / max) : 0
  return (
    <div className="mt-1 h-2.5 rounded-full bg-cream ring-1 ring-line" role="img" aria-label={label}>
      <div className="h-full rounded-full bg-olive-500" style={{ width: `${pct}%` }} />
    </div>
  )
}

type HabitRowProps = { label: string; detail: string; value: number; max: number; hideNumbers: boolean; words: string }

function HabitRow({ label, detail, value, max, hideNumbers, words }: HabitRowProps) {
  return (
    <li className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-muted">{hideNumbers ? words : detail}</span>
      </div>
      <Bar value={value} max={max} label={hideNumbers ? words : detail} />
    </li>
  )
}

function wordsFor(t: (k: TKey) => string, value: number, max: number): string {
  if (value === 0) return t('hab.none')
  return value / Math.max(max, 1) > 0.5 ? t('hab.most') : t('hab.some')
}

export function HabitsCard({ week, hideNumbers }: { week: WeekSummary; hideNumbers: boolean }) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const n = (x: number) => fmtNum(x, lang)
  const of = (k: number, total: number) => t('hab.ofMeals', { k: n(k), n: n(total) })
  const times = (k: number) => t('hab.times', { n: n(k) })
  const w = week
  return (
    <Card as="section" labelledBy="habits-title">
      <h2 id="habits-title" className="font-semibold text-olive-900">
        {t('prog.habits')}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('prog.basedOn', { x: n(w.meals_logged), y: n(w.expected_meals) })}</p>
      <ul className="mt-2 divide-y divide-line">
        <HabitRow label={t('hab.veg')} detail={of(w.veg_fruit_meals, w.meals_logged)} value={w.veg_fruit_meals} max={w.meals_logged} hideNumbers={hideNumbers} words={wordsFor(t, w.veg_fruit_meals, w.meals_logged)} />
        <HabitRow label={t('hab.protein')} detail={of(w.protein_meals, w.protein_possible)} value={w.protein_meals} max={w.protein_possible} hideNumbers={hideNumbers} words={wordsFor(t, w.protein_meals, w.protein_possible)} />
        <HabitRow label={t('hab.breakfast')} detail={t('hab.ofDays', { k: n(w.breakfast_days), n: n(w.days_logged) })} value={w.breakfast_days} max={w.days_logged} hideNumbers={hideNumbers} words={wordsFor(t, w.breakfast_days, w.days_logged)} />
        <HabitRow label={t('hab.sugary')} detail={times(w.sugary_drinks)} value={w.sugary_drinks} max={Math.max(7, w.sugary_drinks)} hideNumbers={hideNumbers} words={wordsFor(t, w.sugary_drinks, 7)} />
        <HabitRow label={t('hab.fried')} detail={times(w.fried_meals)} value={w.fried_meals} max={Math.max(7, w.fried_meals)} hideNumbers={hideNumbers} words={wordsFor(t, w.fried_meals, 7)} />
        <HabitRow label={t('hab.packaged')} detail={times(w.packaged_snacks)} value={w.packaged_snacks} max={Math.max(7, w.packaged_snacks)} hideNumbers={hideNumbers} words={wordsFor(t, w.packaged_snacks, 7)} />
      </ul>
      <p className="mt-2 text-sm text-muted">{t('prog.missingOk')}</p>
    </Card>
  )
}

const FLAG_ICONS = [
  { key: 'vegFruit' as const, icon: Leaf, label: 'icon.veg' as TKey },
  { key: 'protein' as const, icon: Drumstick, label: 'icon.protein' as TKey },
  { key: 'sugaryDrink' as const, icon: CupSoda, label: 'icon.sugary' as TKey },
  { key: 'fried' as const, icon: Flame, label: 'icon.fried' as TKey },
]

export function DayRows({ meals, start }: { meals: MealFlags[]; start: Date }) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const fmt = new Intl.DateTimeFormat(locale(lang), { weekday: 'long', day: 'numeric' })
  return (
    <Card as="section" labelledBy="days-title">
      <h2 id="days-title" className="mb-2 font-semibold text-olive-900">
        {t('prog.days')}
      </h2>
      <ul className="divide-y divide-line">
        {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => {
          const day = meals.filter((m) => dayKey(m.eatenAt) === dayKey(d))
          return (
            <li key={d.toISOString()} className="flex items-start justify-between gap-3 py-2">
              <span className="shrink-0 text-sm">
                <span className="block font-medium">{fmt.format(d)}</span>
                <span className="block text-muted">{day.length ? t('prog.mealsN', { n: fmtNum(day.length, lang) }) : t('prog.noMeals')}</span>
              </span>
              <span className="flex min-w-0 flex-wrap justify-end gap-1">
                {FLAG_ICONS.filter((f) => day.some((m) => m[f.key])).map(({ key, icon: Icon, label }) => (
                  <span key={key} className="inline-flex items-center gap-1 rounded-full bg-olive-50 px-2 py-0.5 text-xs text-olive-900">
                    <Icon size={14} aria-hidden />
                    {t(label)}
                  </span>
                ))}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export function SuggestionCard({ week }: { week: WeekSummary }) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const [result, setResult] = useState<SuggestionResult | null>(null)
  const summary = toHabitSummary(week)
  const key = JSON.stringify(summary)

  useEffect(() => {
    let active = true
    api
      .suggestion(JSON.parse(key))
      .then((r) => active && setResult(r))
      .catch(() => active && setResult({ tip: null, reason: 'error' }))
    return () => {
      active = false
    }
  }, [key])

  const tip = result?.tip
  const text = tip ? (lang === 'bn' ? tip.text_bn : lang === 'en' ? tip.text_en : tip.text_bl) : null
  return (
    <Card as="section" labelledBy="tip-title" tone="mustard">
      <h2 id="tip-title" className="flex items-center gap-2 font-semibold text-olive-900">
        <Lightbulb size={20} aria-hidden className="text-amber-ink" />
        {t('prog.suggestion')}
      </h2>
      {!result && <p role="status">{t('common.loading')}</p>}
      {result && !tip && <p className="mt-2">{result.reason === 'error' ? t('common.error') : t('prog.needMore')}</p>}
      {tip && (
        <>
          <p className="mt-2 text-lg text-ink">{text}</p>
          <p className="mt-2 text-sm text-muted">{t('prog.whyTip')}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Chip icon={tip.reviewed ? BadgeCheck : CircleAlert} tone={tip.reviewed ? 'olive' : 'neutral'}>
              {t(tip.reviewed ? 'prog.reviewed' : 'prog.notReviewed')}
            </Chip>
            {tip.source_url && (
              <a href={tip.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-olive-700 underline underline-offset-4">
                {t('set.sourceLink')}
                <ExternalLink size={14} aria-hidden />
              </a>
            )}
          </div>
        </>
      )}
    </Card>
  )
}

export function MonthView({ meals, today, mealsPerDay }: { meals: MealFlags[]; today: Date; mealsPerDay: number }) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const fmt = new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'short' })
  const weeks = weeksOfMonth(today.getFullYear(), today.getMonth()).map((w) => summarizeWeek(meals, w, mealsPerDay))
  return (
    <Card as="section" labelledBy="month-title">
      <h2 id="month-title" className="font-semibold text-olive-900">
        {new Intl.DateTimeFormat(locale(lang), { month: 'long', year: 'numeric' }).format(today)}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('prog.monthAvg')}</p>
      <ul className="mt-2 divide-y divide-line">
        {weeks.map((w) => (
          <li key={w.start.toISOString()} className="py-2">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{t('prog.weekOf', { d: fmt.format(w.start) })}</span>
              <span className="text-muted">{t('prog.mealsN', { n: fmtNum(w.meals_logged, lang) })}</span>
            </div>
            <Bar value={w.veg_fruit_meals} max={w.meals_logged} label={t('prog.vegShare', { p: fmtNum(Math.round(w.veg_fruit_share * 100), lang) })} />
            <p className="mt-1 text-xs text-muted">{t('prog.vegShare', { p: fmtNum(Math.round(w.veg_fruit_share * 100), lang) })}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function YearView({ meals, today, mealsPerDay }: { meals: MealFlags[]; today: Date; mealsPerDay: number }) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const tiles = yearTiles(meals, today.getFullYear())
  const fmt = new Intl.DateTimeFormat(locale(lang), { month: 'short' })
  const ms = milestones(meals, mealsPerDay)
  return (
    <>
      <Card as="section" labelledBy="year-title">
        <h2 id="year-title" className="mb-3 font-semibold text-olive-900">
          {fmtNum(today.getFullYear(), lang).replace(',', '')}
        </h2>
        <ul className="grid grid-cols-3 gap-2">
          {tiles.map((m) => (
            <li key={m.month} className={`rounded-2xl border p-2 text-center ${m.meals_logged ? 'border-olive-200 bg-olive-50' : 'border-dashed border-line'}`}>
              <span className="block text-sm font-semibold">{fmt.format(new Date(today.getFullYear(), m.month, 1))}</span>
              <span className="block text-xs text-muted">{t('prog.mealsN', { n: fmtNum(m.meals_logged, lang) })}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card as="section" labelledBy="journey-title">
        <h2 id="journey-title" className="mb-2 font-semibold text-olive-900">
          {t('prog.journey')}
        </h2>
        {ms.length === 0 ? (
          <p className="text-muted">{t('prog.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ms.map((m) => (
              <li key={m} className="flex items-center gap-2">
                <Sparkles size={18} aria-hidden className="text-olive-700" />
                {t(`ms.${m}` as TKey)}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
