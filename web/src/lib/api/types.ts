// API contract shared by the real client and the demo adapter. Both implement `Api`, so every screen
// works identically on a static host (demo) and against the FastAPI backend (live).
// Phases 2-8 extend this interface; the demo adapter must implement every method it adds.

import type { ProfileSummary } from '@/features/profile/model'
import type { CheckItemIn, CheckProfile, CheckRequest, CheckResponse, FoodBrief, MealType } from '@/lib/check/types'
import type { CoachAnswer, CoachRequest } from '@/lib/coach/types'
import type { Lang } from '@/lib/i18n'
import type { HabitSummary } from '@/lib/progress/habits'
import type { SuggestionResult } from '@/lib/progress/suggest'
import type { ReferenceTargets } from '@/lib/targets'

export type ApiMode = 'demo' | 'live'

export interface Health {
  status: 'ok'
  mode: 'ai' | 'offline'
  photo_enabled: boolean
  foods: number
}

export interface DataSourceRow {
  source: string
  rows: number
}

export interface DataStatus {
  foods_total: number
  foods_verified: number
  tips_total: number
  tips_verified: number
  sources: DataSourceRow[]
  nutrient_basis: string
}

export interface FoodHit {
  id: string
  name_bn: string
  name_en: string
  verified: boolean
}

/** One food recognised in text or a photo. Names and rough portions only, never nutrition numbers. */
export interface ParsedItem {
  raw_name: string
  food: FoodBrief
  quantity: number | null
  unit: string | null
  grams: number
  assumed: boolean
  confidence: number
  uncertain?: boolean
  portion_note?: string | null
}

export interface UnmatchedItem {
  raw_name: string
  quantity: number | null
  unit: string | null
  suggestions: FoodBrief[]
}

export interface ParseResult {
  items: ParsedItem[]
  unmatched: UnmatchedItem[]
  mode: 'ai' | 'offline'
  warnings: string[]
}

export interface Api {
  readonly mode: ApiMode
  health(): Promise<Health>
  dataStatus(): Promise<DataStatus>
  searchFoods(query: string, lang: Lang): Promise<FoodBrief[]>
  /** Sourced targets/limits for this age and sex; rows without a source come back "unavailable". */
  referenceTargets(summary: ProfileSummary): Promise<ReferenceTargets>
  parseMeal(text: string, lang: Lang): Promise<ParseResult>
  /** The photo is sent once for recognition and never stored. */
  parseImage(photo: Blob, lang: Lang, signal?: AbortSignal): Promise<ParseResult>
  checkMeal(req: CheckRequest): Promise<CheckResponse>
  /** One weekly tip chosen by rules from tips.csv. Only habit counts are sent. */
  suggestion(summary: HabitSummary): Promise<SuggestionResult>
  /** Answers only from the approved knowledge base, with sources. */
  coach(req: CoachRequest): Promise<CoachAnswer>
  /** Check a planned day before eating, slot by slot (same engine). */
  planCheck(slots: Partial<Record<MealType, CheckItemIn[]>>, profile: CheckProfile | null): Promise<PlanCheckResult>
}

export interface PlanCheckResult {
  slots: Partial<Record<MealType, CheckResponse>>
  day_plate: CheckResponse['plate']
  veg_fruit_slots: number
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
