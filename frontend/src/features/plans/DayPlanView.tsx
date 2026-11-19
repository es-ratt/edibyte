import { useEffect, useRef, useState } from 'react'
import { CircleCheck, CircleDashed, Lightbulb, Trash2 } from 'lucide-react'
import { useAppStore, useT } from '@/app/store'
import { Button, Card } from '@/components/ui'
import { FoodSearch } from '@/features/capture/FoodSearch'
import { summarize } from '@/features/profile/model'
import { foodName, FoodIcon } from '@/features/report/food'
import { api, type PlanCheckResult } from '@/lib/api'
import type { MealType } from '@/lib/check/types'
import { getPlan, queueEvent, savePlan } from '@/lib/db'
import { fmtNum, type TKey } from '@/lib/i18n'
import { dayPlanId, emptyDayPlan, SLOTS, type DayPlan } from '@/lib/plans/model'

const LEVEL_KEY = { fits: 'res.fits', mostly: 'res.mostly', change: 'res.change' } as const

export function DayPlanView({ today }: { today: Date }) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const profile = useAppStore((s) => s.profile)
  const [plan, setPlan] = useState<DayPlan>(() => emptyDayPlan(today))
  const [adding, setAdding] = useState<MealType | null>(null)
  const [check, setCheck] = useState<PlanCheckResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<TKey | null>(null)

  // A ref, not state: the load callback below must see edits made after it was created.
  const edited = useRef(false)

  useEffect(() => {
    let active = true
    // The stored plan never overwrites edits made before it finished loading.
    getPlan<DayPlan>(dayPlanId(today)).then((p) => active && p && !edited.current && setPlan(p))
    return () => {
      active = false
    }
  }, [today])

  /** Every change is computed from the CURRENT plan (pure functional update), so quick edits never drop. */
  const update = (change: (cur: DayPlan) => DayPlan) => {
    edited.current = true
    setCheck(null)
    setPlan(change)
  }

  // Side effects live here, not in the state updater (React may re-run updaters).
  const created = useRef(false)
  useEffect(() => {
    if (!edited.current) return
    void savePlan(plan)
    if (!created.current && SLOTS.some((s) => plan.slots[s].length)) {
      created.current = true
      void queueEvent('plan_created')
    }
  }, [plan])

  const handleCheck = async () => {
    setBusy(true)
    setError(null)
    try {
      const slots = Object.fromEntries(
        SLOTS.map((s) => [s, plan.slots[s].map((i) => ({ food_id: i.food.id, quantity: i.quantity, unit: i.unit, source: 'manual' as const, match_confidence: 1 }))]),
      )
      setCheck(await api.planCheck(slots, profile ? summarize(profile) : null))
    } catch {
      setError(SLOTS.some((s) => plan.slots[s].length) ? 'common.error' : 'plan.needFood')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">{t('plan.dayIntro')}</p>
      {SLOTS.map((slot) => (
        <Card key={slot} as="section" labelledBy={`slot-${slot}`}>
          <div className="flex items-center justify-between gap-3">
            <h2 id={`slot-${slot}`} className="font-semibold text-olive-900">
              {t(`meal.${slot}`)}
            </h2>
            {check?.slots[slot] && (
              <span className="text-sm font-semibold text-olive-900">{t(LEVEL_KEY[check.slots[slot]!.verdict.level])}</span>
            )}
          </div>
          {plan.slots[slot].length === 0 ? (
            <p className="mt-1 text-sm text-muted">{t('plan.emptySlot')}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {plan.slots[slot].map((item, i) => (
                <li key={`${item.food.id}-${i}`} className="flex items-center gap-3">
                  <FoodIcon category={item.food.category} size={18} />
                  <span className="flex-1">{foodName(item.food, lang)}</span>
                  <button
                    type="button"
                    aria-label={`${t('conf.remove')}: ${foodName(item.food, lang)}`}
                    className="grid size-11 place-items-center rounded-full text-muted hover:bg-olive-50"
                    onClick={() => update((cur) => ({ ...cur, slots: { ...cur.slots, [slot]: cur.slots[slot].filter((_, j) => j !== i) } }))}
                  >
                    <Trash2 size={18} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {check?.slots[slot] && (
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {check.slots[slot]!.verdict.reasons.filter((r) => r.kind !== 'good').map((r) => (
                <li key={r.code} className="flex gap-2">
                  <Lightbulb size={16} aria-hidden className="mt-0.5 shrink-0 text-amber-ink" />
                  {t(`why.${r.code}` as TKey)}
                </li>
              ))}
            </ul>
          )}
          {adding === slot ? (
            <div className="mt-3">
              <FoodSearch
                autoFocus
                onPick={(food) => {
                  update((cur) => ({ ...cur, slots: { ...cur.slots, [slot]: [...cur.slots[slot], { food, quantity: null, unit: 'serving' }] } }))
                  setAdding(null)
                }}
              />
            </div>
          ) : (
            <Button variant="ghost" className="mt-2" onClick={() => setAdding(slot)}>
              {t('plan.addTo', { slot: t(`meal.${slot}`) })}
            </Button>
          )}
        </Card>
      ))}

      {error && (
        <p role="alert" className="rounded-2xl bg-mustard-100 p-3 font-medium">
          {t(error)}
        </p>
      )}
      <Button block disabled={busy} onClick={() => void handleCheck()}>
        {busy ? t('plan.checking') : t('plan.check')}
      </Button>

      {check && (
        <Card as="section" labelledBy="day-result" tone="tint">
          <h2 id="day-result" className="mb-2 font-semibold text-olive-900">
            {t('plan.dayResult')}
          </h2>
          <ul className="grid grid-cols-2 gap-2">
            {(['grain', 'protein_food', 'veg_fruit', 'dairy'] as const).map((k) => (
              <li key={k} className="flex items-center gap-2 text-sm">
                {check.day_plate[k] ? <CircleCheck size={18} aria-hidden className="text-olive-700" /> : <CircleDashed size={18} aria-hidden className="text-muted" />}
                {t(`plate.${k}` as TKey)}: {t(check.day_plate[k] ? 'plate.yes' : 'plate.no')}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">{t('plan.vegSlots', { n: fmtNum(check.veg_fruit_slots, lang) })}</p>
        </Card>
      )}
    </div>
  )
}
