// DEMO-ONLY port of backend/app/check.py (+ units.to_grams, foodgroups.py).
// The live app always uses POST /meal/check. This copy exists so the static demo (GitHub Pages,
// no backend) runs the full flow on the same CSV data. parity.test.ts compares it against fixtures
// produced by the Python engine (backend/eval/export_check_fixtures.py): any drift fails CI.
// Constants below mirror backend/app/nutrition_config.py.

import { targetsFor, type ReferenceItem } from '@/lib/targets'
import { brief, type Food } from './foods'
import type { Amount, CheckItemOut, CheckRequest, CheckResponse, Confidence, NutrientLine, VerdictReason } from './types'

type RefRows = Parameters<typeof targetsFor>[0]

const KCAL = { protein: 4, carb: 4, fat: 9 }
const FIXED_UNIT_GRAMS: Record<string, number> = { g: 1, kg: 1000, ml: 1, l: 1000, tbsp: 15, tsp: 5 }
const PIECE_UNITS = new Set(['piece', 'slice'])
const UNCERTAIN_BELOW = 0.9
const CONFIDENCE_RANGE: Record<Confidence, number> = { high: 0.15, medium: 0.3, low: 0.5 }
const LOW_CONFIDENCE_DISH_TYPES = new Set(['mixed', 'street', 'restaurant', 'packaged'])
const COUNT_STARCHY_ROOTS_AS_VEGETABLE = false
const PROTEIN_MEALS = new Set(['lunch', 'dinner'])
const VERDICT_CHANGE_AT_TIPS = 3
const STARCHY_ROOT_IDS = new Set(['alu_vorta', 'alu_bhaji'])
const LEVELS: Confidence[] = ['high', 'medium', 'low']

const GET_ENOUGH: [string, keyof Food, string][] = [
  ['protein', 'protein_g', 'g'],
  ['fibre', 'fiber_g', 'g'],
  ['iron', 'iron_mg', 'mg'],
  ['zinc', 'zinc_mg', 'mg'],
  ['calcium', 'calcium_mg', 'mg'],
]
const GO_EASY: [string, keyof Food, string][] = [
  ['free_sugars', 'free_sugars_g', 'g'],
  ['saturated_fat', 'sat_fat_g', 'g'],
  ['trans_fat', 'trans_fat_g', 'g'],
  ['sodium', 'sodium_mg', 'mg'],
]
const MACROS: [string, keyof Food, string][] = [
  ['carbs', 'carbs_g', 'g'],
  ['fat', 'fat_g', 'g'],
]
const ENERGY_PER_G: Record<string, number> = { free_sugars: KCAL.carb, saturated_fat: KCAL.fat, trans_fat: KCAL.fat }

export const METHOD_NOTE =
  'Amounts = food-table value per 100 g x confirmed grams. Ranges use the confidence level ' +
  '(high +/-15%, medium +/-30%, low +/-50%); these widths are engineering defaults until the ' +
  'weighed-meal validation measures the real error. Unverified rows are team estimates.'

/**
 * Python round(x, nd): rounds the EXACT binary value (5.55 is really 5.5499... -> 5.5) and sends
 * exact ties to the even digit. toFixed also works on the exact value, so only true ties need care.
 */
export function pyRound(x: number, nd = 0): number {
  const exact = Math.abs(x).toFixed(nd + 40) // exact decimal expansion of the double
  const cut = exact.indexOf('.') + 1 + nd
  const tail = exact.slice(cut)
  if (tail[0] === '5' && /^5(0*)$/.test(tail)) {
    const kept = exact.slice(0, cut).replace(/\.$/, '')
    const last = Number(kept[kept.length - 1])
    const step = 10 ** -nd
    const down = Number(kept)
    const r = last % 2 === 0 ? down : down + step
    return Math.sign(x) * Number(r.toFixed(nd))
  }
  return Number(x.toFixed(nd))
}

const pyLess = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

// --- units.to_grams ---------------------------------------------------------------------

type Portioned = Pick<Food, 'serving_grams' | 'piece_grams'>

const pieceWeight = (f: Portioned) => (f.piece_grams ? f.piece_grams : null)

export function pieceWeightUnknown(f: Portioned, quantity: number | null, unit: string | null): boolean {
  return quantity !== null && unit !== null && PIECE_UNITS.has(unit) && pieceWeight(f) === null
}

/** Also used by the confirm screen for its grams preview (FoodBrief has the same two fields). */
export function toGrams(f: Portioned, quantity: number | null, unit: string | null): [number, boolean] {
  let assumed = quantity === null
  const qty = quantity === null ? 1 : Math.max(0, quantity)
  const perPiece = pieceWeight(f)
  let grams: number
  if (unit && unit in FIXED_UNIT_GRAMS) grams = qty * FIXED_UNIT_GRAMS[unit]
  else if (unit && PIECE_UNITS.has(unit)) {
    if (perPiece !== null) grams = qty * perPiece
    else {
      grams = f.serving_grams
      assumed = true
    }
  } else if (unit === null && quantity !== null && perPiece !== null) grams = qty * perPiece
  else grams = qty * f.serving_grams
  return [pyRound(grams, 1), assumed]
}

// --- foodgroups ---------------------------------------------------------------------------

export function groupsFor(f: Food): Set<string> {
  const tags = new Set(f.tags)
  const cat = f.category
  const out = new Set<string>()
  if (cat === 'grain' || tags.has('grain') || tags.has('staple')) out.add('grain')
  if (['protein', 'meat', 'fish', 'egg', 'lentil'].some((t) => tags.has(t)) || ['meat', 'fish', 'egg', 'lentil'].includes(cat)) out.add('protein_food')
  if (STARCHY_ROOT_IDS.has(f.id)) {
    out.add('starchy_root')
    if (COUNT_STARCHY_ROOTS_AS_VEGETABLE) out.add('vegetable')
  } else if (cat === 'vegetable' || tags.has('vegetable')) out.add('vegetable')
  if (cat === 'fruit' || tags.has('fruit')) out.add('fruit')
  if (tags.has('dairy')) out.add('dairy')
  if (tags.has('fried')) out.add('fried')
  if (tags.has('sweet')) out.add('sweet')
  if (cat === 'drink' || tags.has('drink')) {
    out.add('drink')
    if (tags.has('sweet')) out.add('sugary_drink')
  }
  if (f.dish_type === 'street') out.add('street_food')
  if (f.dish_type === 'packaged') out.add('packaged_snack')
  return out
}

export function dietOk(f: Food, diet: string): boolean {
  if (diet === 'vegetarian') return f.tags.includes('vegetarian')
  if (diet === 'no_beef') return !f.tags.includes('beef')
  return true
}

// --- confidence ----------------------------------------------------------------------------

const down = (l: Confidence, steps = 1): Confidence => LEVELS[Math.min(LEVELS.length - 1, LEVELS.indexOf(l) + steps)]
const cap = (l: Confidence, c: Confidence): Confidence => LEVELS[Math.max(LEVELS.indexOf(l), LEVELS.indexOf(c))]

export function confidenceFor(f: Food, source: string, assumed: boolean, matchConfidence: number): [Confidence, string[]] {
  const reasons: string[] = []
  let level: Confidence = 'high'
  if (LOW_CONFIDENCE_DISH_TYPES.has(f.dish_type)) {
    level = 'low'
    reasons.push('dish_varies')
  }
  if (!f.verified) {
    level = cap(level, 'medium')
    reasons.push('unverified_data')
  }
  if (source === 'photo') {
    level = cap(level, 'medium')
    reasons.push('portion_from_photo')
  }
  if (assumed) {
    level = down(level)
    reasons.push('portion_assumed')
  }
  if (matchConfidence < UNCERTAIN_BELOW) {
    level = 'low'
    reasons.push('match_unsure')
  }
  return [level, reasons]
}

const rng = (v: number, l: Confidence): [number, number] => [pyRound(v * (1 - CONFIDENCE_RANGE[l]), 1), pyRound(v * (1 + CONFIDENCE_RANGE[l]), 1)]

type Row = [Food, number, Confidence]

function sumNutrient(rows: Row[], attr: keyof Food): [number | null, number | null, number | null, boolean] {
  let value = 0
  let low = 0
  let high = 0
  let known = 0
  for (const [food, grams, level] of rows) {
    const per100 = food[attr] as number | null
    if (per100 === null) continue
    const v = (per100 * grams) / 100
    const [lo, hi] = rng(v, level)
    value += v
    low += lo
    high += hi
    known++
  }
  if (known === 0) return [null, null, null, false]
  return [pyRound(value, 1), pyRound(low, 1), pyRound(high, 1), known === rows.length]
}

const line = (nutrient: string, unit: string, value: number | null, low: number | null, high: number | null, complete: boolean, status: string): NutrientLine => ({
  nutrient, unit, value, low, high, complete, status,
  pct_of_target: null, target_value: null, share_of_meal_energy_pct: null, pct_of_limit: null,
  limit_value: null, limit_unit: null, limit_status: 'none', limit_source_url: null,
}) // fmt: skip

// --- engine ---------------------------------------------------------------------------------

export function checkMeal(req: CheckRequest, allFoods: Food[], refRows: RefRows): CheckResponse {
  const foods = new Map(allFoods.map((f) => [f.id, f]))
  const profile = req.profile
  const oilLot = req.answers.oil === 'lot'
  const notes: string[] = []
  const items: CheckItemOut[] = []
  const rows: Row[] = []
  const mealGroups = new Set<string>()

  for (const it of req.items) {
    const food = foods.get(it.food_id)
    if (!food) throw new Error(`Unknown food_id: ${it.food_id}`)
    const [grams, assumed] = toGrams(food, it.quantity, it.unit)
    let [level, reasons] = confidenceFor(food, it.source, assumed, it.match_confidence)
    if (oilLot && food.dish_type !== 'simple') {
      level = down(level)
      reasons = [...reasons, 'extra_oil']
    }
    const [gLo, gHi] = rng(grams, level)
    const groups = groupsFor(food)
    groups.forEach((g) => mealGroups.add(g))
    items.push({
      food: brief(food), quantity: it.quantity, unit: it.unit, grams, grams_low: gLo, grams_high: gHi, assumed,
      portion_note: pieceWeightUnknown(food, it.quantity, it.unit) ? 'piece_weight_unknown' : null,
      confidence: level, confidence_reasons: reasons, groups: [...groups].sort(pyLess), tags: [...food.tags],
      source: food.source, method: food.method, verified: food.verified,
    }) // fmt: skip
    rows.push([food, grams, level])
  }

  if (oilLot) notes.push('extra_oil_not_counted')
  if (req.answers.fried === 'yes') mealGroups.add('fried')

  const [eVal, eLo, eHi] = sumNutrient(rows, 'kcal')
  const energy: Amount = { value: pyRound(eVal ?? 0), low: pyRound(eLo ?? 0), high: pyRound(eHi ?? 0), unit: 'kcal' }
  const refs = new Map<string, ReferenceItem>(profile ? targetsFor(refRows, profile.age, profile.sex).map((i) => [i.nutrient, i]) : [])
  if (refs.get('energy')?.status !== 'sourced') notes.push('energy_target_pending')

  let addedSugar: CheckResponse['added_sugar'] = null
  if (req.answers.sugar_spoons) {
    addedSugar = { spoons: req.answers.sugar_spoons, grams: req.answers.sugar_spoons * FIXED_UNIT_GRAMS.tsp, method: 'estimate' }
    mealGroups.add('sugary_drink')
    notes.push('added_sugar_estimate')
  }

  const macros = MACROS.map(([code, attr, unit]) => {
    const [v, lo, hi, complete] = sumNutrient(rows, attr)
    return line(code, unit, v, lo, hi, complete, v !== null ? 'known' : 'no_data')
  })

  const getEnough = GET_ENOUGH.map(([code, attr, unit]) => {
    const [v, lo, hi, complete] = sumNutrient(rows, attr)
    const ref = refs.get(code)
    const l = line(code, unit, v, lo, hi, complete, 'no_data')
    if (v !== null) {
      if (ref && ref.status === 'sourced' && ref.value) {
        l.status = 'ok'
        l.target_value = ref.value
        l.pct_of_target = pyRound((100 * v) / ref.value)
      } else l.status = 'target_pending'
    }
    return l
  })

  const goEasy = GO_EASY.map(([code, attr, unit]) => {
    const [v, lo, hi, complete] = sumNutrient(rows, attr)
    const ref = refs.get(code)
    const l = line(code, unit, v, lo, hi, complete, 'no_data')
    if (ref) {
      l.limit_status = ref.status === 'sourced' ? 'sourced' : 'pending'
      l.limit_value = ref.value
      l.limit_unit = ref.unit
      l.limit_source_url = ref.url
    }
    if (v !== null) {
      l.status = complete ? 'known' : 'partial'
      if (complete && ref && ref.status === 'sourced' && ref.value) {
        if (ref.unit === '% of daily energy' && energy.value > 0) {
          const share = (100 * v * ENERGY_PER_G[code]) / energy.value
          l.share_of_meal_energy_pct = pyRound(share)
          l.status = share > ref.value ? 'above' : 'within'
        } else if (ref.unit === 'g per day' && code === 'sodium') {
          l.pct_of_limit = pyRound((100 * (v / 1000)) / ref.value)
          l.status = 'known'
        }
      }
    }
    return l
  })

  const plate = {
    grain: mealGroups.has('grain'),
    protein_food: mealGroups.has('protein_food'),
    veg_fruit: mealGroups.has('vegetable') || mealGroups.has('fruit'),
    dairy: mealGroups.has('dairy'),
  }

  const sources: CheckResponse['sources'] = []
  const bySource = new Map<string, CheckResponse['sources'][number]>()
  for (const [food] of rows) {
    let s = bySource.get(food.source)
    if (!s) {
      s = { kind: 'food', label: food.source, url: food.source_url, verified: food.verified, rows: 0 }
      bySource.set(food.source, s)
      sources.push(s)
    }
    s.rows++
  }
  const refSources = new Map<string, ReferenceItem>()
  for (const r of refs.values()) if (r.status === 'sourced' && r.url) refSources.set(r.url, r)
  for (const [url, r] of refSources) sources.push({ kind: 'reference', label: r.source.split(':')[0], url, verified: true, rows: 1 })

  return {
    teen: profile ? profile.age <= 17 : null,
    items, energy, macros, get_enough: getEnough, go_easy: goEasy, added_sugar: addedSugar, plate,
    verdict: verdict(rows, mealGroups, plate, goEasy, req),
    add_ons: addOns(allFoods, plate, req),
    swaps: swaps(allFoods, rows.map((r) => r[0]), req),
    notes, sources, method_note: METHOD_NOTE,
  } // fmt: skip
}

function wantsProtein(req: CheckRequest): boolean {
  return (req.meal_type !== null && PROTEIN_MEALS.has(req.meal_type)) || req.profile?.goal === 'muscle'
}

function verdict(rows: Row[], groups: Set<string>, plate: CheckResponse['plate'], goEasy: NutrientLine[], req: CheckRequest): CheckResponse['verdict'] {
  const reasons: VerdictReason[] = []
  const diet = req.profile?.diet ?? 'any'
  const r = (code: string, kind: VerdictReason['kind'], food_ids: string[] = []) => reasons.push({ code, kind, food_ids })
  const conflict = rows.filter(([f]) => !dietOk(f, diet)).map(([f]) => f.id)
  if (conflict.length) r('diet_conflict', 'warn', conflict)
  if (plate.veg_fruit) r('has_veg', 'good')
  else r('add_veg', 'tip')
  if (plate.protein_food) r('has_protein', 'good')
  else if (wantsProtein(req)) r('add_protein', 'tip')
  const fried = rows.filter(([f]) => groupsFor(f).has('fried')).map(([f]) => f.id)
  if (fried.length || groups.has('fried')) r('fried', 'tip', fried)
  const sweet = rows.filter(([f]) => groupsFor(f).has('sugary_drink')).map(([f]) => f.id)
  if (sweet.length || groups.has('sugary_drink')) r('sugary_drink', 'tip', sweet)
  for (const l of goEasy) if (l.status === 'above') r(`${l.nutrient}_above`, 'tip')
  const tips = reasons.filter((x) => x.kind === 'tip').length
  const level = conflict.length || tips >= VERDICT_CHANGE_AT_TIPS ? 'change' : tips ? 'mostly' : 'fits'
  return { level, reasons }
}

function addOns(allFoods: Food[], plate: CheckResponse['plate'], req: CheckRequest): CheckResponse['add_ons'] {
  const diet = req.profile?.diet ?? 'any'
  const inMeal = new Set(req.items.map((i) => i.food_id))
  const wanted: [string, string[]][] = []
  if (!plate.veg_fruit) wanted.push(['add_veg', ['vegetable', 'fruit']])
  if (!plate.protein_food && wantsProtein(req)) wanted.push(['add_protein', ['protein_food']])
  const sorted = [...allFoods].sort((a, b) => {
    const av = groupsFor(a).has('vegetable') ? 0 : 1
    const bv = groupsFor(b).has('vegetable') ? 0 : 1
    return av - bv || pyLess(a.id, b.id)
  })
  const out: CheckResponse['add_ons'] = []
  for (const [reason, need] of wanted) {
    const picks = sorted.filter((f) => {
      const g = groupsFor(f)
      return !inMeal.has(f.id) && need.some((n) => g.has(n)) && dietOk(f, diet) && !['fried', 'sweet', 'starchy_root'].some((x) => g.has(x)) && f.category !== 'mixed_dish'
    })
    out.push(...picks.slice(0, 4).map((f) => ({ food: brief(f), reason, tags: [...f.tags] })))
  }
  return out
}

function swaps(allFoods: Food[], meal: Food[], req: CheckRequest): CheckResponse['swaps'] {
  const diet = req.profile?.diet ?? 'any'
  const byId = [...allFoods].sort((a, b) => pyLess(a.id, b.id))
  const out: CheckResponse['swaps'] = []
  for (const f of meal) {
    if (!groupsFor(f).has('fried')) continue
    const o = byId.find((x) => x.id !== f.id && x.category === f.category && !groupsFor(x).has('fried') && dietOk(x, diet) && !groupsFor(x).has('sweet'))
    if (o) out.push({ from_food: brief(f), to_food: brief(o), reason: 'not_fried', to_tags: [...o.tags] })
  }
  return out.slice(0, 3)
}
