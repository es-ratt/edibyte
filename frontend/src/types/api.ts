// Types mirroring the backend API (see API_CONTRACT.md).

export type ApiLang = 'bn' | 'en' | 'banglish'
export type Mode = 'ai' | 'offline'
export type Goal = 'lose' | 'maintain' | 'gain_muscle'
export type Sex = 'male' | 'female' | 'unspecified'
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Diet = 'any' | 'vegetarian' | 'no_beef'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Health {
  status: string
  mode: Mode
  provider: string
  photo_enabled: boolean
  foods: number
}

export interface Food {
  id: string
  name_bn: string
  name_en: string
  aliases: string[]
  category: string
  serving_desc_bn: string
  serving_desc_en: string
  serving_grams: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number | null
  price_bdt_estimate: number | null
  price_date: string | null
  price_source: string | null
  tags: string[]
  source: string
  source_url: string | null
  verified: boolean
  notes: string | null
}

export interface FoodBrief {
  id: string
  name_bn: string
  name_en: string
  name_bl: string
  category: string
  serving_desc_bn: string
  serving_desc_en: string
  serving_grams: number
  verified: boolean
}

export interface Profile {
  goal: Goal
  sex: Sex
  age: number
  height_cm: number
  weight_kg: number
  activity: Activity
  diet: Diet
  daily_budget_bdt: number | null
}

export interface DemoProfile {
  id: string
  name_bn: string
  name_en: string
  name_bl: string
  description_en: string
  profile: Profile
  is_demo: boolean
}

export interface ParsedItem {
  raw_name: string
  food: FoodBrief
  quantity: number | null
  unit: string | null
  grams: number
  assumed: boolean
  confidence: number
}

export interface UnmatchedItem {
  raw_name: string
  quantity: number | null
  unit: string | null
  suggestions: FoodBrief[]
}

export interface ParseResponse {
  items: ParsedItem[]
  unmatched: UnmatchedItem[]
  normalized_text: string
  lang: ApiLang
  mode: Mode
  warnings: string[]
}

export interface ReportItemIn {
  food_id: string
  quantity: number | null
  unit: string | null
}

export interface Nutrients {
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}

export interface Targets extends Nutrients {
  bmr: number
  tdee: number
  floor_applied: boolean
  floor_kcal: number
}

export interface ReportItemOut {
  food: FoodBrief
  quantity: number | null
  unit: string | null
  grams: number
  assumed: boolean
  nutrients: Nutrients
  source: string
  fiber_known: boolean
}

export interface Tip {
  id: string
  text: string
  rule: string
  verified: boolean
  source: string
}

export interface Swap {
  from_food: FoodBrief
  to_food: FoodBrief
  from_price_bdt: number
  to_price_bdt: number
  saving_bdt: number
  price_date: string | null
  price_source: string | null
  estimated: boolean
}

export interface ReportResponse {
  items: ReportItemOut[]
  totals: Nutrients
  targets: Targets
  percent_of_target: Nutrients
  tips: Tip[]
  swaps: Swap[]
  swaps_note: string | null
  has_unverified: boolean
  profile_used: Profile
  lang: ApiLang
  disclaimer: string
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface Source {
  type: 'food' | 'tip'
  id: string
  title: string
  source: string
  verified: boolean
}

export interface CoachResponse {
  answer: string
  sources: Source[]
  lang: ApiLang
  mode: Mode
  guardrail: string | null
}

export interface DataStatus {
  foods_total: number
  foods_verified: number
  foods_with_price: number
  tips_total: number
  tips_verified: number
  sources: { source: string; rows: number }[]
  nutrient_basis: string
}

export interface EvalSummary {
  meals: number
  precision: number
  recall: number
  f1: number
  exact_match_rate: number
}

export type EvalResults =
  | { status: 'not_run'; message: string }
  | {
      status: 'ok'
      timestamp: string
      test_set: string
      mode: string
      provider: string
      metric_note: string
      overall: EvalSummary
      by_lang: Record<string, EvalSummary>
      failures: unknown[]
    }
