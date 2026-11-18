// Food rows for the demo adapter, parsed from backend/data/foods_seed.csv (the same file the API
// seeds from). Mirrors backend/app/seed.py food_from_row + store.brief.

import { parseCsv } from '@/lib/targets'
import type { FoodBrief } from './types'

export interface Food {
  id: string
  name_bn: string
  name_en: string
  aliases: string[]
  category: string
  dish_type: string
  serving_desc_bn: string
  serving_desc_en: string
  serving_grams: number
  piece_grams: number | null
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number | null
  free_sugars_g: number | null
  sat_fat_g: number | null
  trans_fat_g: number | null
  sodium_mg: number | null
  iron_mg: number | null
  zinc_mg: number | null
  calcium_mg: number | null
  tags: string[]
  source: string
  source_url: string | null
  verified: boolean
  method: string
}

const list = (v: string) => [...new Set(v.split('|').map((s) => s.trim()).filter(Boolean))]
const num = (v: string | undefined) => (v && v.trim() ? Number(v) : null)
const str = (v: string | undefined) => (v && v.trim() ? v.trim() : null)

export function parseFoodsCsv(text: string): Food[] {
  const [header, ...lines] = parseCsv(text)
  return lines.map((f) => {
    const r = Object.fromEntries(header.map((h, i) => [h, f[i] ?? '']))
    // verified=true only with a cited source URL, reviewer and date (as in seed.py).
    const verified = ['true', '1', 'yes'].includes(r.verified.trim().toLowerCase()) && !!(str(r.source_url) && str(r.verified_by) && str(r.date_checked))
    return {
      id: r.id.trim(),
      name_bn: r.name_bn.trim(),
      name_en: r.name_en.trim(),
      aliases: list(r.aliases),
      category: r.category.trim(),
      dish_type: str(r.dish_type) ?? 'mixed',
      serving_desc_bn: r.serving_desc_bn.trim(),
      serving_desc_en: r.serving_desc_en.trim(),
      serving_grams: Number(r.serving_grams),
      piece_grams: num(r.piece_grams),
      kcal: Number(r.kcal),
      protein_g: Number(r.protein_g),
      carbs_g: Number(r.carbs_g),
      fat_g: Number(r.fat_g),
      fiber_g: num(r.fiber_g),
      free_sugars_g: num(r.free_sugars_g),
      sat_fat_g: num(r.sat_fat_g),
      trans_fat_g: num(r.trans_fat_g),
      sodium_mg: num(r.sodium_mg),
      iron_mg: num(r.iron_mg),
      zinc_mg: num(r.zinc_mg),
      calcium_mg: num(r.calcium_mg),
      tags: list(r.tags),
      source: r.source.trim() || 'UNKNOWN',
      source_url: str(r.source_url),
      verified,
      method: str(r.method) ?? 'estimate',
    }
  })
}

/** First Latin-script alias, first letter upper-cased (store.banglish_name). */
export function banglishName(f: Food): string {
  const a = f.aliases.find((x) => /^[\x00-\x7F]*$/.test(x))
  return a ? a.charAt(0).toUpperCase() + a.slice(1) : f.name_en
}

export function brief(f: Food): FoodBrief {
  return {
    id: f.id,
    name_bn: f.name_bn,
    name_en: f.name_en,
    name_bl: banglishName(f),
    category: f.category,
    serving_desc_bn: f.serving_desc_bn,
    serving_desc_en: f.serving_desc_en,
    serving_grams: f.serving_grams,
    piece_grams: f.piece_grams,
    verified: f.verified,
  }
}
