// API contract shared by the real client and the demo adapter. Both implement `Api`, so every screen
// works identically on a static host (demo) and against the FastAPI backend (live).
// Phases 2-8 extend this interface; the demo adapter must implement every method it adds.

import type { Lang } from '@/lib/i18n'

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

export interface Api {
  readonly mode: ApiMode
  health(): Promise<Health>
  dataStatus(): Promise<DataStatus>
  searchFoods(query: string, lang: Lang): Promise<FoodHit[]>
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
