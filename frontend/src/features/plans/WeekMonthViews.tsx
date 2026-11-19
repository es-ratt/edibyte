import { useEffect, useState } from 'react'
import { PartyPopper, Sparkles, Target } from 'lucide-react'
import { useAppStore, useT } from '@/app/store'
import { CheckGroup, OptionGroup } from '@/components/form'
import { Card } from '@/components/ui'
import { getPlan, listMeals, queueEvent, savePlan } from '@/lib/db'
import { fmtNum, htmlLang, type TKey } from '@/lib/i18n'
import {
  CHECKINS, emptyMonthPlan, emptyWeekPlan, evaluateWeek, GOALS, MAX_WEEK_GOALS, monthPlanId, monthReview, THEMES, toggleGoal,
  TREAT_LABELS, weekPlanId, type MonthPlan, type TreatLabel, type WeekPlan,
} from '@/lib/plans/model' // fmt: skip
import { addDays, flagsOf, weeksOfMonth, weekStart, type MealFlags } from '@/lib/progress/habits'

function useMealFlags(): MealFlags[] {
  const [meals, setMeals] = useState<MealFlags[]>([])
  useEffect(() => {
    let active = true
    listMeals('2000-01-01', '2100-01-01').then((m) => active && setMeals(m.map(flagsOf)))
    return () => {
      active = false
    }
  }, [])
  return meals
}

export function WeekPlanView({ today }: { today: Date }) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const meals = useMealFlags()
  const [plan, setPlan] = useState<WeekPlan>(() => emptyWeekPlan(today))

  useEffect(() => {
    let active = true
    getPlan<WeekPlan>(weekPlanId(today)).then((p) => active && p && setPlan(p))
    return () => {
      active = false
    }
  }, [today])

  const update = (next: WeekPlan) => {
    if (!plan.goals.length && next.goals.length) void queueEvent('plan_created')
    setPlan(next)
    void savePlan(next)
  }

  const results = evaluateWeek(plan, meals)
  const start = weekStart(today)
  const dayName = new Intl.DateTimeFormat(htmlLang(lang) === 'bn' ? 'bn-BD' : 'en-GB', { weekday: 'long' })
  const treatFor = (day: number) => plan.treatDays.find((d) => d.day === day)?.label ?? 'none'

  // Record "plan_completed" once every goal reaches 5 of 7 (re-runs only when the wins change).
  const allWon = results.length > 0 && results.every((r) => r.win)
  useEffect(() => {
    if (allWon) void queueEvent('plan_completed')
  }, [allWon])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">{t('plan.weekIntro')}</p>
      <Card as="section">
        <CheckGroup
          legend={t('plan.goals')}
          options={GOALS}
          values={plan.goals}
          onChange={(values) => {
            const added = values.find((v) => !plan.goals.includes(v))
            const removed = plan.goals.find((g) => !values.includes(g))
            const changed = added ?? removed
            if (changed) update({ ...plan, goals: toggleGoal(plan.goals, changed) })
          }}
          label={(g) => t(`goal.${g}` as TKey)}
        />
        {plan.goals.length >= MAX_WEEK_GOALS && <p className="mt-2 text-sm text-muted">{t('plan.maxGoals')}</p>}
      </Card>

      <Card as="section" labelledBy="treats-title">
        <h2 id="treats-title" className="font-semibold text-olive-900">
          {t('plan.treats')}
        </h2>
        <p className="mb-3 text-sm text-muted">{t('plan.treatsNote')}</p>
        <ul className="flex flex-col gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <label htmlFor={`treat-${i}`} className="text-sm font-medium">
                {dayName.format(addDays(start, i))}
              </label>
              <select
                id={`treat-${i}`}
                className="min-h-tap rounded-2xl border border-line bg-surface px-3"
                value={treatFor(i)}
                onChange={(e) => {
                  const others = plan.treatDays.filter((d) => d.day !== i)
                  const v = e.target.value
                  update({ ...plan, treatDays: v === 'none' ? others : [...others, { day: i, label: v as TreatLabel }] })
                }}
              >
                <option value="none">{t('plan.treatNone')}</option>
                {TREAT_LABELS.map((l) => (
                  <option key={l} value={l}>
                    {t(`treat.${l}` as TKey)}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </Card>

      {results.length > 0 && (
        <Card as="section" labelledBy="actual-title" tone="tint">
          <h2 id="actual-title" className="mb-2 font-semibold text-olive-900">
            {t('plan.progress')}
          </h2>
          <ul className="flex flex-col gap-3">
            {results.map((r) => (
              <li key={r.goal}>
                <p className="flex items-center gap-2 font-medium">
                  <Target size={16} aria-hidden className="text-olive-700" />
                  {t(`goal.${r.goal}` as TKey)}
                </p>
                <p className="text-sm text-muted">{t('plan.metDays', { m: fmtNum(r.met, lang), l: fmtNum(r.logged, lang) })}</p>
                <p className="flex items-center gap-1 text-sm">
                  {r.win && <PartyPopper size={16} aria-hidden className="text-olive-700" />}
                  {t(r.win ? 'plan.win' : 'plan.keepGoing')}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

export function MonthPlanView({ today }: { today: Date }) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const meals = useMealFlags()
  const weekStarts = weeksOfMonth(today.getFullYear(), today.getMonth())
  const [plan, setPlan] = useState<MonthPlan>(() => emptyMonthPlan(today, weekStarts.length))

  useEffect(() => {
    let active = true
    getPlan<MonthPlan>(monthPlanId(today)).then((p) => active && p && setPlan(p))
    return () => {
      active = false
    }
  }, [today])

  const update = (next: MonthPlan) => {
    if (!plan.theme && next.theme) void queueEvent('plan_created')
    setPlan(next)
    void savePlan(next)
  }
  const review = monthReview(plan, weekStarts, meals)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">{t('plan.monthIntro')}</p>
      <Card as="section">
        <OptionGroup legend={t('plan.theme')} name="theme" options={THEMES} value={plan.theme ?? ('' as never)} onChange={(theme) => update({ ...plan, theme })} label={(x) => t(`theme.${x}` as TKey)} />
      </Card>
      <Card as="section" labelledBy="checkins-title">
        <h2 id="checkins-title" className="mb-2 font-semibold text-olive-900">
          {t('plan.checkins')}
        </h2>
        <div className="flex flex-col gap-4">
          {weekStarts.map((_, i) => (
            <OptionGroup
              key={i}
              legend={t('plan.weekN', { n: fmtNum(i + 1, lang) })}
              name={`checkin-${i}`}
              options={CHECKINS}
              value={plan.checkins[i] ?? ('' as never)}
              onChange={(c) => update({ ...plan, checkins: plan.checkins.map((x, j) => (j === i ? c : x)) })}
              label={(c) => t(`checkin.${c}` as TKey)}
              columns={3}
            />
          ))}
        </div>
      </Card>
      <Card as="section" labelledBy="review-title" tone="tint">
        <h2 id="review-title" className="mb-2 flex items-center gap-2 font-semibold text-olive-900">
          <Sparkles size={18} aria-hidden />
          {t('plan.review')}
        </h2>
        {!review ? (
          <p className="text-muted">{t('plan.pickTheme')}</p>
        ) : (
          <>
            <ul className="flex flex-col gap-1 text-sm">
              {review.weeks.map((w, i) => (
                <li key={i}>{t('plan.reviewWeek', { n: fmtNum(i + 1, lang), m: fmtNum(w.met, lang), l: fmtNum(w.logged, lang) })}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm">
              {t('plan.reviewCheckins', { g: fmtNum(review.checkins.good, lang), o: fmtNum(review.checkins.okay, lang), h: fmtNum(review.checkins.hard, lang) })}
            </p>
            <p className="mt-2 text-sm text-muted">{t('plan.reviewNote')}</p>
          </>
        )}
      </Card>
    </div>
  )
}
