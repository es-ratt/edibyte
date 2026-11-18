// DEMO ADAPTER. Sample data only, used when no backend is configured (e.g. GitHub Pages).
// Every screen shows the "Demo data" banner while this adapter is active.
// Values are placeholders and are never marked verified.

import referenceCsv from '../../../../backend/data/reference_targets.csv?raw'
import type { ProfileSummary } from '@/features/profile/model'
import type { Lang } from '@/lib/i18n'
import { parseReferenceCsv, targetsFor, type ReferenceTargets } from '@/lib/targets'
import type { Api, DataStatus, FoodHit, Health } from './types'

export const DEMO_SOURCE = 'DEMO SAMPLE - not real data'

const FOODS: FoodHit[] = [
  { id: 'bhat', name_bn: 'ভাত', name_en: 'Rice (cooked)', verified: false },
  { id: 'dal', name_bn: 'ডাল', name_en: 'Lentil dal', verified: false },
  { id: 'dim_sheddho', name_bn: 'সেদ্ধ ডিম', name_en: 'Boiled egg', verified: false },
  { id: 'ruti', name_bn: 'রুটি', name_en: 'Ruti (flatbread)', verified: false },
  { id: 'shak', name_bn: 'শাক', name_en: 'Leafy greens', verified: false },
  { id: 'fuchka', name_bn: 'ফুচকা', name_en: 'Fuchka', verified: false },
  { id: 'singara', name_bn: 'সিঙ্গারা', name_en: 'Singara', verified: false },
  { id: 'burger', name_bn: 'বার্গার', name_en: 'Burger', verified: false },
]

// Real sourced reference rows (same file as the backend), not sample data.
const REFERENCE_ROWS = parseReferenceCsv(referenceCsv)

const wait = <T,>(value: T, ms = 250): Promise<T> => new Promise((r) => setTimeout(() => r(value), ms))

export function createDemoApi(): Api {
  return {
    mode: 'demo',
    health: (): Promise<Health> => wait({ status: 'ok', mode: 'offline', photo_enabled: true, foods: FOODS.length }),
    dataStatus: (): Promise<DataStatus> =>
      wait({
        foods_total: FOODS.length,
        foods_verified: 0,
        tips_total: 0,
        tips_verified: 0,
        sources: [{ source: DEMO_SOURCE, rows: FOODS.length }],
        nutrient_basis: 'per 100 g edible portion',
      }),
    searchFoods: (query: string, _lang: Lang): Promise<FoodHit[]> => {
      const q = query.trim().toLowerCase()
      const hits = q
        ? FOODS.filter((f) => f.id.includes(q) || f.name_en.toLowerCase().includes(q) || f.name_bn.includes(q))
        : FOODS
      return wait(hits.slice(0, 10))
    },
    referenceTargets: (s: ProfileSummary): Promise<ReferenceTargets> =>
      wait({ age: s.age, sex: s.sex, activity: s.activity, teen: s.age <= 17, items: targetsFor(REFERENCE_ROWS, s.age, s.sex) }),
  }
}
