// Meal history kept in this browser only (localStorage). Nothing here is sent to a server.

import { load, save } from './storage'

export interface MealEntry {
  id: string
  ts: number // epoch ms
  mealType: string | null
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  foods: { bn: string; en: string }[]
}

const KEY = 'history'
const MAX_ENTRIES = 200

export const loadHistory = (): MealEntry[] => load<MealEntry[]>(KEY, [])

export function addMeal(entry: Omit<MealEntry, 'id'>): MealEntry[] {
  const list = [{ ...entry, id: `${entry.ts}-${Math.random().toString(36).slice(2, 7)}` }, ...loadHistory()].slice(0, MAX_ENTRIES)
  save(KEY, list)
  return list
}

export function clearHistory(): void {
  save(KEY, [])
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

export interface DayTotal {
  date: Date
  kcal: number
  protein_g: number
  meals: number
}

/** Totals for the last `days` days (oldest first), including days with no meals. */
export function lastDays(entries: MealEntry[], days = 7, now = new Date()): DayTotal[] {
  const out: DayTotal[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const k = dayKey(date)
    const mine = entries.filter((e) => dayKey(new Date(e.ts)) === k)
    out.push({
      date,
      kcal: Math.round(mine.reduce((a, e) => a + e.kcal, 0)),
      protein_g: Math.round(mine.reduce((a, e) => a + e.protein_g, 0) * 10) / 10,
      meals: mine.length,
    })
  }
  return out
}
