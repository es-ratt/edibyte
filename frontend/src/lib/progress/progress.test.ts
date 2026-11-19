import { describe, expect, it } from 'vitest'
import cases from '../../../../backend/eval/suggestion_cases.json'
import tipsCsv from '../../../../backend/data/tips.csv?raw'
import type { StoredMeal } from '@/lib/db'
import { addDays, flagsOf, milestones, sampleMeals, summarizeWeek, toHabitSummary, weekStart, weeksOfMonth, yearTiles, type HabitSummary } from './habits'
import { chooseTip, parseTipsCsv, parseTrigger } from './suggest'

const tips = parseTipsCsv(tipsCsv)
const MON = new Date(2026, 10, 16) // Monday 16 Nov 2026

const meal = (dayOffset: number, mealType: string, plate: Partial<Record<string, boolean>>, groups: string[] = []): StoredMeal => ({
  eatenAt: new Date(2026, 10, 16 + dayOffset, 13).toISOString(),
  mealType,
  items: [],
  plate,
  groups,
})

describe('suggestion rules (same cases as backend/tests/test_suggestions.py)', () => {
  it.each((cases as { name: string; summary: HabitSummary; expected: string | null }[]).map((c) => [c.name, c] as const))('%s', (_n, c) => {
    expect(chooseTip(tips, c.summary)?.id ?? null).toBe(c.expected)
  })
  it('rejects anything that is not "metric op number"', () => {
    expect(() => parseTrigger("alert('x') > 1")).toThrow()
  })
})

describe('weekly habits', () => {
  const meals = [
    meal(0, 'breakfast', { protein_food: true }, ['sugary_drink']),
    meal(0, 'lunch', { veg_fruit: true, protein_food: true }),
    meal(1, 'lunch', { veg_fruit: false, protein_food: false }, ['fried']),
    meal(2, 'snack', {}, ['street_food']),
    meal(7, 'lunch', { veg_fruit: true }), // next week: excluded
  ].map(flagsOf)

  it('counts food-group habits for one Monday-Sunday week', () => {
    const w = summarizeWeek(meals, MON, 3)
    expect(w).toMatchObject({ meals_logged: 4, days_logged: 3, expected_meals: 21, veg_fruit_meals: 1, sugary_drinks: 1, fried_meals: 2 })
    expect(w.protein_possible).toBe(2) // lunch/dinner only
    expect(w.protein_share).toBe(0.5)
  })

  it('judges breakfast only on logged days (missing logs are not failures)', () => {
    expect(summarizeWeek(meals, MON, 3).breakfast_share).toBe(0.33)
  })

  it('sends counts only to the server', () => {
    expect(Object.keys(toHabitSummary(summarizeWeek(meals, MON, 3))).sort()).toEqual(
      ['breakfast_share', 'days_logged', 'fried_meals', 'meals_logged', 'packaged_snacks', 'protein_share', 'sugary_drinks', 'veg_fruit_share'],
    )
  })

  it('finds Monday and the weeks of a month', () => {
    expect(weekStart(new Date(2026, 10, 22)).getDate()).toBe(16)
    const weeks = weeksOfMonth(2026, 10)
    expect(weeks[0].getDate()).toBe(26) // Mon 26 Oct holds 1 Nov
    expect(weeks).toHaveLength(6)
  })

  it('builds year tiles and gentle milestones', () => {
    expect(yearTiles(meals, 2026)[10].meals_logged).toBe(5)
    expect(milestones(meals, 3)).toEqual(['first_meal'])
  })

  it('sample data spans weeks and has gaps', () => {
    const s = sampleMeals(addDays(MON, 3))
    expect(s.length).toBeGreaterThan(50)
    expect(summarizeWeek(s, MON, 3).meals_logged).toBeLessThan(12)
  })
})
