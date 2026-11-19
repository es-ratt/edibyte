// DEMO ADAPTER: used when no backend is configured (e.g. GitHub Pages). The app shows the
// "Demo data" banner whenever this adapter is active.
// It reads the SAME data files as the API (backend/data/*.csv) and runs the parity-tested port of
// the check engine (lib/check/engine.ts). Only text parsing and photo recognition are simplified:
// photos always return one labelled sample meal.

import foodsCsv from '../../../../backend/data/foods_seed.csv?raw'
import referenceCsv from '../../../../backend/data/reference_targets.csv?raw'
import tipsCsv from '../../../../backend/data/tips.csv?raw'
import type { ProfileSummary } from '@/features/profile/model'
import { checkMeal, toGrams } from '@/lib/check/engine'
import { brief, parseFoodsCsv, type Food } from '@/lib/check/foods'
import type { CheckRequest, CheckResponse, FoodBrief } from '@/lib/check/types'
import { demoCoach } from '@/lib/coach/demo'
import type { CoachAnswer, CoachRequest } from '@/lib/coach/types'
import type { Lang } from '@/lib/i18n'
import type { HabitSummary } from '@/lib/progress/habits'
import { parseTipsCsv, suggestionFor, type SuggestionResult } from '@/lib/progress/suggest'
import { parseReferenceCsv, targetsFor, type ReferenceTargets } from '@/lib/targets'
import { ApiError, type Api, type DataStatus, type Health, type ParsedItem, type ParseResult } from './types'

const FOODS: Food[] = parseFoodsCsv(foodsCsv)
const BY_ID = new Map(FOODS.map((f) => [f.id, f]))
const REFERENCE_ROWS = parseReferenceCsv(referenceCsv)
const TIPS = parseTipsCsv(tipsCsv)

/** The meal a demo "photo" always returns (names + rough portions only, as a vision model would). */
export const DEMO_PHOTO_MEAL: { food_id: string; quantity: number | null; unit: string | null; confidence: number }[] = [
  { food_id: 'bhat', quantity: 1, unit: 'plate', confidence: 0.97 },
  { food_id: 'dal', quantity: 1, unit: 'bati', confidence: 0.93 },
  { food_id: 'dim_bhaji', quantity: 1, unit: 'piece', confidence: 0.86 }, // shows the "not sure" highlight
]

const wait = <T,>(value: T, ms = 300): Promise<T> => new Promise((r) => setTimeout(() => r(value), ms))

function item(food: Food, rawName: string, quantity: number | null, unit: string | null, confidence: number): ParsedItem {
  const [grams, assumed] = toGrams(food, quantity, unit)
  return { raw_name: rawName, food: brief(food), quantity, unit, grams, assumed, confidence, uncertain: confidence < 0.9 }
}

// Longest alias first so "dim bhaji" beats "dim".
const ALIASES = FOODS.flatMap((f) => [f.id.replace(/_/g, ' '), f.name_en, f.name_bn, ...f.aliases].map((a) => [a.toLowerCase(), f] as const)).sort(
  (a, b) => b[0].length - a[0].length,
)

/** Demo-only text matcher: finds known food names and a number written right before them. */
export function demoParse(text: string): ParseResult {
  let rest = ` ${text.toLowerCase().replace(/[,.;]/g, ' ')} `
  const items: ParsedItem[] = []
  for (const [alias, food] of ALIASES) {
    if (alias.length < 2) continue
    const at = rest.indexOf(` ${alias} `)
    if (at < 0 || items.some((i) => i.food.id === food.id)) continue
    const before = rest.slice(0, at).trim().split(/\s+/).pop() ?? ''
    const qty = /^\d+(\.\d+)?$/.test(before) ? Number(before) : null
    items.push(item(food, alias, qty, null, 1))
    rest = rest.slice(0, at) + ' '.repeat(alias.length + 1) + rest.slice(at + alias.length + 1)
  }
  return { items, unmatched: [], mode: 'offline', warnings: items.length ? ['demo_sample'] : ['no_food_found'] }
}

export function createDemoApi(): Api {
  return {
    mode: 'demo',
    health: (): Promise<Health> => wait({ status: 'ok', mode: 'offline', photo_enabled: true, foods: FOODS.length }, 150),
    dataStatus: (): Promise<DataStatus> => {
      const sources = new Map<string, number>()
      FOODS.forEach((f) => sources.set(f.source, (sources.get(f.source) ?? 0) + 1))
      return wait({
        foods_total: FOODS.length,
        foods_verified: FOODS.filter((f) => f.verified).length,
        tips_total: 0,
        tips_verified: 0,
        sources: [...sources].map(([source, rows]) => ({ source, rows })),
        nutrient_basis: 'per 100 g edible portion',
      })
    },
    searchFoods: (query: string, _lang: Lang): Promise<FoodBrief[]> => {
      const q = query.trim().toLowerCase()
      const hits = q ? FOODS.filter((f) => [f.id, f.name_en.toLowerCase(), f.name_bn, ...f.aliases.map((a) => a.toLowerCase())].some((n) => n.includes(q))) : FOODS
      return wait(hits.slice(0, 10).map(brief), 150)
    },
    referenceTargets: (s: ProfileSummary): Promise<ReferenceTargets> =>
      wait({ age: s.age, sex: s.sex, activity: s.activity, teen: s.age <= 17, items: targetsFor(REFERENCE_ROWS, s.age, s.sex) }),
    parseMeal: (text: string, _lang: Lang): Promise<ParseResult> => wait(demoParse(text)),
    parseImage: (_photo: Blob, _lang: Lang, signal?: AbortSignal): Promise<ParseResult> =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const items = DEMO_PHOTO_MEAL.map((m) => item(BY_ID.get(m.food_id)!, BY_ID.get(m.food_id)!.name_en, m.quantity, m.unit, m.confidence))
          resolve({ items, unmatched: [], mode: 'ai', warnings: ['from_photo', 'demo_sample'] })
        }, 1200)
        signal?.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(new ApiError('Cancelled', -1))
        })
      }),
    checkMeal: (req: CheckRequest): Promise<CheckResponse> => wait(checkMeal(req, FOODS, REFERENCE_ROWS)),
    suggestion: (summary: HabitSummary): Promise<SuggestionResult> => wait(suggestionFor(TIPS, summary), 150),
    coach: (req: CoachRequest): Promise<CoachAnswer> => wait(demoCoach(req, FOODS, REFERENCE_ROWS), 400),
  }
}
