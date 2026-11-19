// Habit metrics from logged meals. Food-group based (robust to photo portion error): no grams,
// no calories, no scores. Missing logs are not failures: every summary says "X of Y meals logged".

import type { StoredMeal } from '@/lib/db'

export interface MealFlags {
  eatenAt: Date
  mealType: string | null
  vegFruit: boolean
  protein: boolean
  sugaryDrink: boolean
  fried: boolean
  packaged: boolean
}

export interface HabitSummary {
  meals_logged: number
  days_logged: number
  veg_fruit_share: number
  protein_share: number
  sugary_drinks: number
  fried_meals: number
  packaged_snacks: number
  breakfast_share: number
}

export interface WeekSummary extends HabitSummary {
  start: Date
  expected_meals: number
  veg_fruit_meals: number
  protein_meals: number
  protein_possible: number
  breakfast_days: number
}

const PROTEIN_MEALS = new Set(['lunch', 'dinner'])

export function flagsOf(m: StoredMeal): MealFlags {
  const groups = new Set((m.groups as string[] | undefined) ?? [])
  const plate = (m.plate as Record<string, boolean> | undefined) ?? {}
  return {
    eatenAt: new Date(m.eatenAt),
    mealType: (m.mealType as string | undefined) ?? null,
    vegFruit: !!plate.veg_fruit,
    protein: !!plate.protein_food,
    sugaryDrink: groups.has('sugary_drink'),
    // Fried or street food both count as "fried / fast food" meals.
    fried: groups.has('fried') || groups.has('street_food'),
    packaged: groups.has('packaged_snack'),
  }
}

export const dayKey = (d: Date): string => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

/** Monday 00:00 of the week containing `d` (local time). */
export function weekStart(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7))
  return s
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

const share = (part: number, whole: number) => (whole > 0 ? Math.round((100 * part) / whole) / 100 : 0)

export function summarizeWeek(meals: MealFlags[], start: Date, mealsPerDay: number): WeekSummary {
  const end = addDays(start, 7)
  const inWeek = meals.filter((m) => m.eatenAt >= start && m.eatenAt < end)
  const days = new Set(inWeek.map((m) => dayKey(m.eatenAt)))
  const breakfastDays = new Set(inWeek.filter((m) => m.mealType === 'breakfast').map((m) => dayKey(m.eatenAt)))
  const proteinMeals = inWeek.filter((m) => m.mealType !== null && PROTEIN_MEALS.has(m.mealType))
  const vegFruit = inWeek.filter((m) => m.vegFruit).length
  const protein = proteinMeals.filter((m) => m.protein).length
  return {
    start,
    expected_meals: 7 * mealsPerDay,
    meals_logged: inWeek.length,
    days_logged: days.size,
    veg_fruit_meals: vegFruit,
    veg_fruit_share: share(vegFruit, inWeek.length),
    protein_meals: protein,
    protein_possible: proteinMeals.length,
    protein_share: share(protein, proteinMeals.length),
    sugary_drinks: inWeek.filter((m) => m.sugaryDrink).length,
    fried_meals: inWeek.filter((m) => m.fried).length,
    packaged_snacks: inWeek.filter((m) => m.packaged).length,
    breakfast_days: breakfastDays.size,
    // Breakfast is judged only on days with any log: an unlogged day is not a skipped breakfast.
    breakfast_share: share(breakfastDays.size, days.size),
  }
}

/** Only the counts the suggestion engine needs (what is sent to POST /suggestions). */
export function toHabitSummary(w: WeekSummary): HabitSummary {
  const { meals_logged, days_logged, veg_fruit_share, protein_share, sugary_drinks, fried_meals, packaged_snacks, breakfast_share } = w
  return { meals_logged, days_logged, veg_fruit_share, protein_share, sugary_drinks, fried_meals, packaged_snacks, breakfast_share }
}

/** Weeks (Monday starts) overlapping a calendar month. */
export function weeksOfMonth(year: number, month: number): Date[] {
  const first = weekStart(new Date(year, month, 1))
  const nextMonth = new Date(year, month + 1, 1)
  const out: Date[] = []
  for (let w = first; w < nextMonth; w = addDays(w, 7)) out.push(w)
  return out
}

export interface MonthTile {
  month: number
  meals_logged: number
  veg_fruit_share: number
}

export function yearTiles(meals: MealFlags[], year: number): MonthTile[] {
  return Array.from({ length: 12 }, (_, month) => {
    const inMonth = meals.filter((m) => m.eatenAt.getFullYear() === year && m.eatenAt.getMonth() === month)
    return { month, meals_logged: inMonth.length, veg_fruit_share: share(inMonth.filter((m) => m.vegFruit).length, inMonth.length) }
  })
}

export type Milestone = 'first_meal' | 'meals_10' | 'meals_50' | 'meals_100' | 'veg_week'

/** Gentle journey markers. Nothing is lost by missing a day (no streaks). */
export function milestones(meals: MealFlags[], mealsPerDay: number): Milestone[] {
  const out: Milestone[] = []
  if (meals.length >= 1) out.push('first_meal')
  if (meals.length >= 10) out.push('meals_10')
  if (meals.length >= 50) out.push('meals_50')
  if (meals.length >= 100) out.push('meals_100')
  const weeks = new Set(meals.map((m) => weekStart(m.eatenAt).getTime()))
  const vegWeek = [...weeks].some((w) => {
    const s = summarizeWeek(meals, new Date(w), mealsPerDay)
    return s.meals_logged >= 5 && s.veg_fruit_share >= 0.5
  })
  if (vegWeek) out.push('veg_week')
  return out
}

/** Clearly labelled sample data for the demo: never saved, never mixed with real logs. */
export function sampleMeals(today: Date = new Date()): MealFlags[] {
  const pattern: [number, string, boolean, boolean, boolean, boolean][] = [
    // [days ago, meal type, veg/fruit, protein, sugary drink, fried]
    [0, 'lunch', true, true, false, false], [0, 'breakfast', false, true, true, false],
    [1, 'lunch', true, true, false, false], [1, 'snack', false, false, true, true], [1, 'dinner', true, true, false, false],
    [2, 'breakfast', true, false, false, false], [2, 'lunch', false, true, false, true],
    [3, 'dinner', true, true, false, false], [3, 'snack', false, false, true, true],
    [4, 'lunch', true, true, false, false], [5, 'dinner', false, true, false, false], [6, 'breakfast', true, true, false, false],
  ] // fmt: skip
  const meals: MealFlags[] = []
  for (let week = 0; week < 10; week++) {
    for (const [ago, mealType, vegFruit, protein, sugaryDrink, fried] of pattern) {
      if ((ago + week) % 5 === 4) continue // some unlogged meals, like real life
      meals.push({ eatenAt: addDays(today, -(ago + 7 * week)), mealType, vegFruit, protein, sugaryDrink, fried, packaged: false })
    }
  }
  return meals
}
