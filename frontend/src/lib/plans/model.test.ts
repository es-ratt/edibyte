import { describe, expect, it } from 'vitest'
import type { MealFlags } from '@/lib/progress/habits'
import { emptyMonthPlan, emptyWeekPlan, evaluateWeek, monthReview, toggleGoal, weekPlanId, type WeekPlan } from './model'

const MON = new Date(2026, 10, 16)
const meal = (day: number, mealType: string, f: Partial<MealFlags> = {}): MealFlags => ({
  eatenAt: new Date(2026, 10, 16 + day, 13),
  mealType,
  vegFruit: false,
  protein: false,
  sugaryDrink: false,
  fried: false,
  packaged: false,
  ...f,
})

describe('week plan', () => {
  it('allows at most three goals', () => {
    let g = toggleGoal([], 'veg_two_meals')
    g = toggleGoal(g, 'breakfast_daily')
    g = toggleGoal(g, 'less_fried')
    expect(toggleGoal(g, 'no_sugary_drink')).toEqual(g)
    expect(toggleGoal(g, 'less_fried')).toEqual(['veg_two_meals', 'breakfast_daily'])
  })

  it('counts 5 of 7 days as a win and ignores unlogged days', () => {
    const plan: WeekPlan = { ...emptyWeekPlan(MON), goals: ['breakfast_daily'] }
    const meals = [0, 1, 2, 3, 4].map((d) => meal(d, 'breakfast'))
    const [r] = evaluateWeek(plan, meals)
    expect(r).toMatchObject({ met: 5, logged: 5, win: true })
    const [few] = evaluateWeek(plan, meals.slice(0, 2))
    expect(few).toMatchObject({ met: 2, logged: 2, win: false })
  })

  it('treat days count as met for go-easy goals, never as failures', () => {
    const plan: WeekPlan = { ...emptyWeekPlan(MON), goals: ['no_sugary_drink', 'veg_two_meals'], treatDays: [{ day: 4, label: 'friday_biryani' }] }
    const meals = [meal(4, 'dinner', { sugaryDrink: true })]
    const [sugar, veg] = evaluateWeek(plan, meals)
    expect(sugar).toMatchObject({ met: 1, logged: 1 })
    expect(veg).toMatchObject({ met: 0, logged: 1 }) // treat day does not excuse a "get enough" goal
  })

  it('uses the Monday of the week as id', () => {
    expect(weekPlanId(new Date(2026, 10, 20))).toBe('week-2026-11-16')
  })
})

describe('month plan', () => {
  it('reviews the theme week by week and counts check-ins', () => {
    const plan = { ...emptyMonthPlan(MON, 2), theme: 'better_breakfast' as const, checkins: ['good' as const, 'hard' as const] }
    const review = monthReview(plan, [MON, new Date(2026, 10, 23)], [meal(0, 'breakfast'), meal(1, 'lunch')])!
    expect(review.weeks[0]).toMatchObject({ met: 1, logged: 2 })
    expect(review.checkins).toEqual({ good: 1, okay: 0, hard: 1 })
  })
  it('has no review without a theme', () => {
    expect(monthReview(emptyMonthPlan(MON, 4), [MON], [])).toBeNull()
  })
})
