// Display helpers for foods and units.

import type { Food, FoodBrief } from '@/types/api'
import type { Lang, TKey } from './i18n'

type Named = Pick<FoodBrief, 'name_bn' | 'name_en'> & { name_bl?: string; aliases?: string[] }

/** Food name in the UI language. Banglish uses the first Latin-script alias. */
export function foodName(food: Named, lang: Lang): string {
  if (lang === 'bn') return food.name_bn
  if (lang === 'bl') {
    if (food.name_bl) return food.name_bl
    const alias = food.aliases?.find((a) => /^[\x20-\x7e]+$/.test(a))
    if (alias) return alias[0].toUpperCase() + alias.slice(1)
  }
  return food.name_en
}

export function servingDesc(food: Pick<FoodBrief, 'serving_desc_bn' | 'serving_desc_en'>, lang: Lang): string {
  return lang === 'bn' ? food.serving_desc_bn : food.serving_desc_en
}

export function toBrief(f: Food): FoodBrief {
  return {
    id: f.id, name_bn: f.name_bn, name_en: f.name_en, name_bl: foodName(f, 'bl'), category: f.category,
    serving_desc_bn: f.serving_desc_bn, serving_desc_en: f.serving_desc_en, serving_grams: f.serving_grams, verified: f.verified,
  }
}

// Units offered in the review step. Mirrors backend/app/nutrition_config.py.
export const UNITS = ['serving', 'plate', 'bati', 'cup', 'glass', 'piece', 'slice', 'handful', 'g', 'ml', 'tbsp', 'tsp'] as const
export type Unit = (typeof UNITS)[number]
const FIXED_GRAMS: Record<string, number> = { g: 1, kg: 1000, ml: 1, l: 1000, tbsp: 15, tsp: 5 }

export const unitKey = (u: string) => `unit.${u}` as TKey

/** Client-side preview only; the backend recomputes grams for the report. */
export function previewGrams(food: FoodBrief, quantity: number | null, unit: string | null): number {
  const q = quantity ?? 1
  const u = unit ?? 'serving'
  return Math.round(u in FIXED_GRAMS ? q * FIXED_GRAMS[u] : q * food.serving_grams)
}
