// Mirrors backend/app/schemas.py (CheckRequest / CheckResponse). Codes, not text: the app translates.

export type Confidence = 'high' | 'medium' | 'low'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type ItemSource = 'photo' | 'text' | 'manual'

export interface CheckItemIn {
  food_id: string
  quantity: number | null
  unit: string | null
  source: ItemSource
  match_confidence: number
}

export interface CheckAnswers {
  oil: 'none' | 'little' | 'normal' | 'lot' | 'unknown'
  fried: 'yes' | 'no' | 'unknown'
  sugar_spoons: number | null
}

export interface CheckProfile {
  age: number
  sex: 'female' | 'male' | 'unspecified'
  activity: 'low' | 'medium' | 'high'
  goal: 'balanced' | 'energy' | 'muscle' | 'maintain'
  diet: 'any' | 'vegetarian' | 'no_beef'
}

export interface CheckRequest {
  items: CheckItemIn[]
  answers: CheckAnswers
  profile: CheckProfile | null
  meal_type: MealType | null
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
  piece_grams: number | null
  verified: boolean
}

export interface Amount {
  value: number
  low: number
  high: number
  unit: string
}

export interface CheckItemOut {
  food: FoodBrief
  quantity: number | null
  unit: string | null
  grams: number
  grams_low: number
  grams_high: number
  assumed: boolean
  portion_note: string | null
  confidence: Confidence
  confidence_reasons: string[]
  groups: string[]
  tags: string[]
  source: string
  method: string
  verified: boolean
}

export interface NutrientLine {
  nutrient: string
  unit: string
  value: number | null
  low: number | null
  high: number | null
  complete: boolean
  status: string
  pct_of_target: number | null
  target_value: number | null
  share_of_meal_energy_pct: number | null
  pct_of_limit: number | null
  limit_value: number | null
  limit_unit: string | null
  limit_status: 'sourced' | 'pending' | 'none'
  limit_source_url: string | null
}

export interface VerdictReason {
  code: string
  kind: 'good' | 'tip' | 'warn'
  food_ids: string[]
}

export interface CheckResponse {
  teen: boolean | null
  items: CheckItemOut[]
  energy: Amount
  macros: NutrientLine[]
  get_enough: NutrientLine[]
  go_easy: NutrientLine[]
  added_sugar: { spoons: number; grams: number; method: 'estimate' } | null
  plate: Record<'grain' | 'protein_food' | 'veg_fruit' | 'dairy', boolean>
  verdict: { level: 'fits' | 'mostly' | 'change'; reasons: VerdictReason[] }
  add_ons: { food: FoodBrief; reason: string; tags: string[] }[]
  swaps: { from_food: FoodBrief; to_food: FoodBrief; reason: string; to_tags: string[] }[]
  notes: string[]
  sources: { kind: 'food' | 'reference'; label: string; url: string | null; verified: boolean; rows: number }[]
  method_note: string
}
