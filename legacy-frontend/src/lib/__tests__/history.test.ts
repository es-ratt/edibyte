import { describe, expect, it } from 'vitest'
import { lastDays, type MealEntry } from '../history'

const entry = (ts: number, kcal: number, protein_g: number): MealEntry => ({
  id: String(ts), ts, mealType: 'lunch', kcal, protein_g, carbs_g: 0, fat_g: 0, foods: [],
})

describe('lastDays', () => {
  const now = new Date(2026, 9, 26, 15, 0) // 26 Oct 2026
  it('returns 7 days, oldest first, including empty days', () => {
    const days = lastDays([], 7, now)
    expect(days).toHaveLength(7)
    expect(days[6].date.getDate()).toBe(26)
    expect(days[0].date.getDate()).toBe(20)
    expect(days.every((d) => d.kcal === 0 && d.meals === 0)).toBe(true)
  })

  it('adds up meals that fall on the same day', () => {
    const morning = new Date(2026, 9, 26, 8, 0).getTime()
    const noon = new Date(2026, 9, 26, 13, 0).getTime()
    const yesterday = new Date(2026, 9, 25, 20, 0).getTime()
    const days = lastDays([entry(morning, 300, 10), entry(noon, 500, 20.5), entry(yesterday, 400, 8)], 7, now)
    expect(days[6]).toMatchObject({ kcal: 800, protein_g: 30.5, meals: 2 })
    expect(days[5]).toMatchObject({ kcal: 400, meals: 1 })
  })

  it('ignores meals older than the window', () => {
    const old = new Date(2026, 9, 1, 12, 0).getTime()
    expect(lastDays([entry(old, 999, 9)], 7, now).every((d) => d.meals === 0)).toBe(true)
  })
})
