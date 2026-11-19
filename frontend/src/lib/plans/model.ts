// Plans: day (4 meal slots), week (max 3 habit goals + treat days), month (one theme + weekly
// check-ins + review). Stored on the device. Planned vs actual is gentle: 5 of 7 days is a win,
// treat days count as met for "go easy" goals, unlogged days are not failures.

import type { StoredPlan } from '@/lib/db'
import type { FoodBrief, MealType } from '@/lib/check/types'
import { addDays, dayKey, weekStart, type MealFlags } from '@/lib/progress/habits'

export const SLOTS: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner']
export const MAX_WEEK_GOALS = 3
export const WIN_DAYS = 5

export type GoalId = 'veg_two_meals' | 'protein_lunch_dinner' | 'no_sugary_drink' | 'less_fried' | 'breakfast_daily'
export const GOALS: GoalId[] = ['veg_two_meals', 'protein_lunch_dinner', 'no_sugary_drink', 'less_fried', 'breakfast_daily']
/** "Go easy" goals: a planned treat day counts as met. */
const GO_EASY_GOALS = new Set<GoalId>(['no_sugary_drink', 'less_fried'])

export type TreatLabel = 'eid' | 'birthday' | 'friday_biryani' | 'other'
export const TREAT_LABELS: TreatLabel[] = ['eid', 'birthday', 'friday_biryani', 'other']

export type ThemeId = 'more_veg' | 'protein_every_day' | 'fewer_sweet_drinks' | 'better_breakfast' | 'less_fried'
export const THEMES: ThemeId[] = ['more_veg', 'protein_every_day', 'fewer_sweet_drinks', 'better_breakfast', 'less_fried']
export type CheckIn = 'good' | 'okay' | 'hard'
export const CHECKINS: CheckIn[] = ['good', 'okay', 'hard']

export interface PlanItem {
  food: FoodBrief
  quantity: number | null
  unit: string
}

export interface DayPlan extends StoredPlan {
  kind: 'day'
  slots: Record<MealType, PlanItem[]>
}

export interface WeekPlan extends StoredPlan {
  kind: 'week'
  goals: GoalId[]
  /** 0 = Monday ... 6 = Sunday */
  treatDays: { day: number; label: TreatLabel }[]
}

export interface MonthPlan extends StoredPlan {
  kind: 'month'
  theme: ThemeId | null
  checkins: (CheckIn | null)[]
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const dayPlanId = (d: Date) => `day-${iso(d)}`
export const weekPlanId = (d: Date) => `week-${iso(weekStart(d))}`
export const monthPlanId = (d: Date) => `month-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export function emptyDayPlan(d: Date): DayPlan {
  return { id: dayPlanId(d), kind: 'day', startsOn: iso(d), slots: { breakfast: [], lunch: [], snack: [], dinner: [] } }
}

export function emptyWeekPlan(d: Date): WeekPlan {
  return { id: weekPlanId(d), kind: 'week', startsOn: iso(weekStart(d)), goals: [], treatDays: [] }
}

export function emptyMonthPlan(d: Date, weeks: number): MonthPlan {
  return { id: monthPlanId(d), kind: 'month', startsOn: iso(new Date(d.getFullYear(), d.getMonth(), 1)), theme: null, checkins: Array(weeks).fill(null) }
}

/** Adding a 4th goal is refused (max 3 keeps the week achievable). */
export function toggleGoal(goals: GoalId[], g: GoalId): GoalId[] {
  if (goals.includes(g)) return goals.filter((x) => x !== g)
  return goals.length >= MAX_WEEK_GOALS ? goals : [...goals, g]
}

function dayMet(goal: GoalId, meals: MealFlags[]): boolean | null {
  if (!meals.length) return null // not logged: neither met nor failed
  switch (goal) {
    case 'veg_two_meals':
      return meals.filter((m) => m.vegFruit).length >= 2
    case 'protein_lunch_dinner':
      return meals.some((m) => (m.mealType === 'lunch' || m.mealType === 'dinner') && m.protein)
    case 'no_sugary_drink':
      return !meals.some((m) => m.sugaryDrink)
    case 'less_fried':
      return meals.filter((m) => m.fried).length <= 1
    case 'breakfast_daily':
      return meals.some((m) => m.mealType === 'breakfast')
  }
}

export interface GoalResult {
  goal: GoalId
  met: number
  logged: number
  win: boolean
}

export function evaluateWeek(plan: WeekPlan, meals: MealFlags[]): GoalResult[] {
  const start = new Date(`${plan.startsOn}T00:00:00`)
  const treat = new Set(plan.treatDays.map((t) => t.day))
  return plan.goals.map((goal) => {
    let met = 0
    let logged = 0
    for (let i = 0; i < 7; i++) {
      const key = dayKey(addDays(start, i))
      const day = meals.filter((m) => dayKey(m.eatenAt) === key)
      if (treat.has(i) && GO_EASY_GOALS.has(goal)) {
        met++
        logged++
        continue
      }
      const r = dayMet(goal, day)
      if (r === null) continue
      logged++
      if (r) met++
    }
    return { goal, met, logged, win: met >= WIN_DAYS }
  })
}

const THEME_GOAL: Record<ThemeId, GoalId> = {
  more_veg: 'veg_two_meals',
  protein_every_day: 'protein_lunch_dinner',
  fewer_sweet_drinks: 'no_sugary_drink',
  better_breakfast: 'breakfast_daily',
  less_fried: 'less_fried',
}

export interface MonthReview {
  weeks: { start: Date; met: number; logged: number }[]
  checkins: Record<CheckIn, number>
}

export function monthReview(plan: MonthPlan, weekStarts: Date[], meals: MealFlags[]): MonthReview | null {
  if (!plan.theme) return null
  const goal = THEME_GOAL[plan.theme]
  const weeks = weekStarts.map((start) => {
    const [r] = evaluateWeek({ id: '', kind: 'week', startsOn: iso(start), goals: [goal], treatDays: [] }, meals)
    return { start, met: r.met, logged: r.logged }
  })
  const checkins: Record<CheckIn, number> = { good: 0, okay: 0, hard: 0 }
  plan.checkins.forEach((c) => c && checkins[c]++)
  return { weeks, checkins }
}

export function planFoodIds(plan: DayPlan): string[] {
  return SLOTS.flatMap((s) => plan.slots[s].map((i) => i.food.id))
}
