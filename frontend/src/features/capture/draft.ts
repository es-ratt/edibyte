// The meal being checked: in memory only (never persisted, never contains the photo).

import { create } from 'zustand'
import type { ParseResult } from '@/lib/api'
import type { CheckAnswers, CheckResponse, FoodBrief, ItemSource, MealType } from '@/lib/check/types'

export interface DraftRow {
  key: string
  food: FoodBrief
  quantity: number | null
  unit: string | null
  source: ItemSource
  matchConfidence: number
  rawName: string
}

/** A phrase that matched no food. Shown on the confirm screen, never dropped silently. */
export interface UnmatchedRow {
  key: string
  rawName: string
  quantity: number | null
  unit: string | null
  suggestions: FoodBrief[]
}

export function unmatchedFromParse(result: ParseResult): UnmatchedRow[] {
  return result.unmatched.map((u) => ({ key: newKey(), rawName: u.raw_name, quantity: u.quantity, unit: u.unit, suggestions: u.suggestions }))
}

export const DEFAULT_ANSWERS: CheckAnswers = { oil: 'unknown', fried: 'unknown', sugar_spoons: null }

export function mealTypeFor(date: Date = new Date()): MealType {
  const h = date.getHours()
  if (h < 11) return 'breakfast'
  if (h < 16) return 'lunch'
  if (h < 19) return 'snack'
  return 'dinner'
}

let counter = 0
export const newKey = (): string => `r${Date.now().toString(36)}${(counter++).toString(36)}`

/**
 * Every row gets an explicit unit so what the confirm screen shows is exactly what the engine
 * computes: a bare count of a countable food ("2 ruti") means pieces; otherwise one serving.
 */
export function explicitUnit(food: FoodBrief, quantity: number | null, unit: string | null): string {
  if (unit) return unit
  return quantity !== null && food.piece_grams ? 'piece' : 'serving'
}

export function rowsFromParse(result: ParseResult, source: ItemSource): DraftRow[] {
  return result.items.map((i) => ({
    key: newKey(),
    food: i.food,
    quantity: i.quantity,
    unit: explicitUnit(i.food, i.quantity, i.unit),
    source,
    matchConfidence: i.confidence,
    rawName: i.raw_name,
  }))
}

interface DraftState {
  rows: DraftRow[]
  unmatched: UnmatchedRow[]
  answers: CheckAnswers
  mealType: MealType
  fromPhoto: boolean
  /** When the user started this meal (for the anonymous time-to-log measure). */
  startedAt: number
  result: CheckResponse | null
  start: (rows: DraftRow[], fromPhoto: boolean, unmatched?: UnmatchedRow[]) => void
  /** Resolve an unmatched phrase: pick a food (kept with its amount) or dismiss it (food = null). */
  resolveUnmatched: (key: string, food: FoodBrief | null) => void
  markStarted: () => void
  updateRow: (key: string, patch: Partial<DraftRow>) => void
  removeRow: (key: string) => void
  addFood: (food: FoodBrief) => void
  setAnswers: (patch: Partial<CheckAnswers>) => void
  setMealType: (mealType: MealType) => void
  setResult: (result: CheckResponse) => void
  reset: () => void
}

export const useDraft = create<DraftState>()((set) => ({
  rows: [],
  unmatched: [],
  answers: DEFAULT_ANSWERS,
  mealType: mealTypeFor(),
  fromPhoto: false,
  startedAt: Date.now(),
  result: null,
  start: (rows, fromPhoto, unmatched = []) => set({ rows, unmatched, fromPhoto, answers: DEFAULT_ANSWERS, mealType: mealTypeFor(), result: null }),
  markStarted: () => set({ startedAt: Date.now() }),
  resolveUnmatched: (key, food) =>
    set((s) => {
      const u = s.unmatched.find((x) => x.key === key)
      const unmatched = s.unmatched.filter((x) => x.key !== key)
      if (!u || !food) return { unmatched }
      const row: DraftRow = { key: newKey(), food, quantity: u.quantity, unit: explicitUnit(food, u.quantity, u.unit), source: 'manual', matchConfidence: 1, rawName: u.rawName }
      return { unmatched, rows: [...s.rows, row] }
    }),
  updateRow: (key, patch) => set((s) => ({ rows: s.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) })),
  removeRow: (key) => set((s) => ({ rows: s.rows.filter((r) => r.key !== key) })),
  addFood: (food) =>
    set((s) => ({ rows: [...s.rows, { key: newKey(), food, quantity: null, unit: 'serving', source: 'manual', matchConfidence: 1, rawName: '' }] })),
  setAnswers: (patch) => set((s) => ({ answers: { ...s.answers, ...patch } })),
  setMealType: (mealType) => set({ mealType }),
  setResult: (result) => set({ result }),
  reset: () => set({ rows: [], unmatched: [], answers: DEFAULT_ANSWERS, result: null, fromPhoto: false }),
}))
