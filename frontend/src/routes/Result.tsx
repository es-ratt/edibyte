import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRightLeft, CalendarPlus, Camera, CircleCheck, Info, MessageCircle, Plus, ShieldAlert } from 'lucide-react'
import { useAppStore, useMode, useT } from '@/app/store'
import { Button, Card, PageTitle } from '@/components/ui'
import { useDraft } from '@/features/capture/draft'
import type { Avoid } from '@/features/profile/model'
import { foodName, FoodIcon } from '@/features/report/food'
import { ConfidenceChip, NutrientRow, PlateBalance, VerdictCard } from '@/features/report/parts'
import type { CheckResponse, Confidence } from '@/lib/check/types'
import { addMeal, getSetting, queueEvent, setSetting } from '@/lib/db'
import { fmtNum } from '@/lib/i18n'

const ORDER: Confidence[] = ['high', 'medium', 'low']

/** Avoid-list items we can spot from food tags. Others (peanut, wheat...) cannot be checked. */
const AVOID_TAG: Partial<Record<Avoid, string>> = { egg: 'egg', milk: 'dairy', fish: 'fish' }

export function mealConfidence(r: CheckResponse): Confidence {
  return r.items.reduce<Confidence>((acc, i) => (ORDER.indexOf(i.confidence) > ORDER.indexOf(acc) ? i.confidence : acc), 'high')
}

export default function Result() {
  const t = useT()
  const navigate = useNavigate()
  const lang = useAppStore((s) => s.lang)
  const profile = useAppStore((s) => s.profile)
  const mode = useMode()
  const { result, mealType, reset, startedAt } = useDraft()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (result) void queueEvent('report_viewed')
  }, [result])

  if (!result) return <Navigate to="/capture" replace />

  const conf = mealConfidence(result)
  const allVerified = result.items.every((i) => i.verified)
  const avoid = profile?.avoid ?? []
  const avoidTags = new Set(avoid.map((a) => AVOID_TAG[a]).filter(Boolean))
  const avoidHits = result.items.filter((i) => i.tags.some((tag) => avoidTags.has(tag)))
  // Never suggest a food from the avoid list, as an add-on or as a swap.
  const addOns = result.add_ons.filter((a) => !a.tags.some((tag) => avoidTags.has(tag)))
  const swaps = result.swaps.filter((s) => !s.to_tags.some((tag) => avoidTags.has(tag)))
  const n = (x: number) => fmtNum(x, lang)

  const handleAdd = async () => {
    await addMeal({
      eatenAt: new Date().toISOString(),
      mealType,
      // Food ids, grams and confidence only: never photos or typed text.
      items: result.items.map((i) => ({ foodId: i.food.id, grams: i.grams, confidence: i.confidence })),
      groups: [...new Set(result.items.flatMap((i) => i.groups))],
      plate: result.plate,
    })
    // Anonymous time-to-log: seconds from starting the meal to adding it (capped at one hour).
    void queueEvent('meal_logged', { value: Math.min(3600, Math.round((Date.now() - startedAt) / 1000)) })
    if (!(await getSetting<boolean>('firstLogSent', false))) {
      await setSetting('firstLogSent', true)
      void queueEvent('first_log')
    }
    setSaved(true)
  }

  return (
    <>
      <PageTitle>{t('route.result')}</PageTitle>
      <div className="flex flex-col gap-4">
        <VerdictCard verdict={result.verdict} />
        <PlateBalance plate={result.plate} />

        {/* Teen mode: calories are not the hero. They appear only under "How was this calculated?". */}
        {!mode.teen && !mode.hideNumbers && (
          <Card as="section" labelledBy="energy-title">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="energy-title" className="font-semibold text-olive-900">
                {t('res.energy')}
              </h2>
              <span>{t('res.amount', { v: n(result.energy.value), u: 'kcal', lo: n(result.energy.low), hi: n(result.energy.high) })}</span>
            </div>
            <p className="mt-2 text-sm text-muted">{t('res.energyPending')}</p>
          </Card>
        )}

        <Card as="section" labelledBy="enough-title">
          <h2 id="enough-title" className="font-semibold text-olive-900">
            {t('res.getEnough')}
          </h2>
          <ul>
            {result.get_enough.map((l) => (
              <NutrientRow key={l.nutrient} line={l} kind="target" confidence={conf} verified={allVerified} hideNumbers={mode.hideNumbers} />
            ))}
          </ul>
        </Card>

        <Card as="section" labelledBy="easy-title">
          <h2 id="easy-title" className="font-semibold text-olive-900">
            {t('res.goEasy')}
          </h2>
          <ul>
            {result.go_easy.map((l) => (
              <NutrientRow key={l.nutrient} line={l} kind="limit" confidence={conf} verified={allVerified} hideNumbers={mode.hideNumbers} />
            ))}
          </ul>
          {result.added_sugar && !mode.hideNumbers && (
            <p className="mt-2 text-sm text-ink">{t('res.addedSugar', { n: n(result.added_sugar.spoons), g: n(result.added_sugar.grams) })}</p>
          )}
          {result.notes.includes('extra_oil_not_counted') && <p className="mt-2 text-sm text-muted">{t('res.oilNote')}</p>}
        </Card>

        {(addOns.length > 0 || swaps.length > 0) && (
          <Card as="section" labelledBy="ideas-title">
            {addOns.length > 0 && (
              <>
                <h2 id="ideas-title" className="mb-2 font-semibold text-olive-900">
                  {t('res.addOns')}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {addOns.slice(0, 6).map((a) => (
                    <li key={a.food.id} className="inline-flex items-center gap-1 rounded-full border border-olive-200 bg-olive-50 px-3 py-1">
                      <Plus size={14} aria-hidden />
                      {foodName(a.food, lang)}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {swaps.length > 0 && (
              <>
                <h2 className="mb-2 mt-4 font-semibold text-olive-900">{t('res.swaps')}</h2>
                <ul className="flex flex-col gap-1">
                  {swaps.map((s) => (
                    <li key={s.from_food.id} className="flex items-center gap-2">
                      <ArrowRightLeft size={16} aria-hidden className="text-olive-700" />
                      {t('res.swapLine', { from: foodName(s.from_food, lang), to: foodName(s.to_food, lang) })}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        )}

        <section aria-labelledby="allergy-title" className="rounded-card border border-terracotta bg-terracotta-50 p-5">
          <h2 id="allergy-title" className="mb-1 flex items-center gap-2 font-semibold text-terracotta">
            <ShieldAlert size={20} aria-hidden />
            {t('res.allergyTitle')}
          </h2>
          <p className="text-ink">{t('res.allergyBody')}</p>
          {avoidHits.length > 0 && (
            <p className="mt-2 font-semibold text-ink">{t('res.avoidHit', { foods: avoidHits.map((i) => foodName(i.food, lang)).join(', ') })}</p>
          )}
        </section>

        <details className="rounded-card bg-surface p-5 shadow-card">
          <summary className="flex min-h-tap cursor-pointer items-center gap-2 font-semibold text-olive-900">
            <Info size={18} aria-hidden />
            {t('res.how')}
          </summary>
          <p className="mt-2 text-sm text-ink">{t('res.howBody')}</p>
          <h3 className="mt-4 font-semibold text-olive-900">{t('res.items')}</h3>
          <ul className="mt-2 flex flex-col gap-3">
            {result.items.map((i, idx) => (
              <li key={`${i.food.id}-${idx}`} className="flex items-start gap-3">
                <FoodIcon category={i.food.category} size={18} />
                <div>
                  <p className="font-medium">{foodName(i.food, lang)}</p>
                  {!mode.hideNumbers && <p className="text-sm text-muted">{t('res.amount', { v: n(i.grams), u: t('unit.g'), lo: n(i.grams_low), hi: n(i.grams_high) })}</p>}
                  <div className="mt-1">
                    <ConfidenceChip level={i.confidence} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {!mode.hideNumbers && (
            <p className="mt-4 text-sm text-ink">
              {t('res.energy')}: {t('res.amount', { v: n(result.energy.value), u: 'kcal', lo: n(result.energy.low), hi: n(result.energy.high) })}
            </p>
          )}
          <h3 className="mt-4 font-semibold text-olive-900">{t('res.sources')}</h3>
          <ul className="mt-1 list-disc ps-5 text-sm">
            {result.sources.map((s) => (
              <li key={s.label}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-olive-700 underline underline-offset-4">
                    {s.label}
                  </a>
                ) : (
                  s.label
                )}{' '}
                ({t(s.verified ? 'src.verified' : 'src.unverified')})
              </li>
            ))}
          </ul>
        </details>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => navigate('/coach')}>
            <MessageCircle size={18} aria-hidden />
            {t('res.askCoach')}
          </Button>
          <Button disabled={saved || mode.trackingHidden} onClick={() => void handleAdd()}>
            {saved ? <CircleCheck size={18} aria-hidden /> : <CalendarPlus size={18} aria-hidden />}
            {saved ? t('res.added') : t('res.addToDay')}
          </Button>
        </div>
        <Link
          to="/capture"
          onClick={() => reset()}
          className="inline-flex min-h-tap items-center justify-center gap-2 font-semibold text-olive-700 underline underline-offset-4"
        >
          <Camera size={18} aria-hidden />
          {t('res.newMeal')}
        </Link>
      </div>
    </>
  )
}
