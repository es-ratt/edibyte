// DEMO coach (no backend). Answers ONLY from the shared CSVs (foods, WHO reference rows) and the
// confirmed meal; uses the same guardrail categories as backend/app/guardrails.py (simplified word
// lists); otherwise says it has no data. The live app always uses POST /coach.

import { banglishName, type Food } from '@/lib/check/foods'
import { translate, type Lang, type TKey } from '@/lib/i18n'
import { targetsFor } from '@/lib/targets'
import type { CoachAnswer, CoachRequest, CoachSource } from './types'

type RefRows = Parameters<typeof targetsFor>[0]

const WHO_URL = 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet'
const TEEN_MAX_AGE = 17

const has = (q: string, words: string[]) => words.some((w) => (/^[a-z ]+$/.test(w) ? new RegExp(`\\b${w}\\b`).test(q) : q.includes(w)))

const GUARDS: [string, string[]][] = [
  ['pregnancy', ['pregnant', 'pregnancy', 'গর্ভবতী', 'breastfeeding']],
  ['eating_disorder', ['starve', 'stop eating', 'vomit', 'purge', 'laxative', 'crash diet', 'only water', 'না খেয়ে', 'na kheye']],
  ['allergy', ['allergy', 'allergic', 'অ্যালার্জি', 'elarji']],
  ['condition', ['diabetes', 'blood pressure', 'bp', 'cholesterol', 'heart disease', 'ডায়াবেটিস', 'প্রেশার', 'কোলেস্টেরল']],
  ['medical', ['medicine', 'treatment', 'insulin', 'cure', 'supplement', 'ওষুধ', 'oshudh']],
]
const WEIGHT_LOSS = ['lose weight', 'weight loss', 'slim', 'ojon komate', 'ওজন কমাতে', 'diet plan']
const CALORIE_WORDS = ['calorie', 'calories', 'kcal', 'energy', 'ক্যালরি', 'shokti', 'kalori']
const REF_WORDS: Record<string, string[]> = {
  free_sugars: ['sugar', 'chini', 'চিনি', 'mishti', 'sweet'],
  sodium: ['salt', 'sodium', 'lobon', 'লবণ'],
  saturated_fat: ['saturated'],
  trans_fat: ['trans'],
  fruit_veg: ['fruit', 'vegetable', 'fol', 'shobji', 'ফল', 'সবজি'],
}
const MEAL_WORDS = ['meal', 'this', 'plate', 'khabar', 'eta', 'ei', 'খাবার', 'এটা', 'এই']

function foodName(f: Food, lang: Lang): string {
  return lang === 'bn' ? f.name_bn : lang === 'en' ? f.name_en : banglishName(f)
}

function findFoods(q: string, foods: Food[]): Food[] {
  const hits: Food[] = []
  const aliases = foods.flatMap((f) => [f.name_en, f.name_bn, f.id.replace(/_/g, ' '), ...f.aliases].map((a) => [a.toLowerCase(), f] as const))
  aliases.sort((a, b) => b[0].length - a[0].length)
  let rest = ` ${q} `
  for (const [a, f] of aliases) {
    if (a.length < 2 || hits.includes(f)) continue
    const at = rest.indexOf(` ${a} `)
    if (at >= 0) {
      hits.push(f)
      rest = rest.slice(0, at) + ' '.repeat(a.length + 1) + rest.slice(at + a.length + 1)
    }
  }
  return hits
}

export function demoCoach(req: CoachRequest, foods: Food[], refRows: RefRows): CoachAnswer {
  const lang = req.lang
  const t = (k: TKey, v?: Record<string, string | number>) => translate(lang, k, v)
  const q = req.question.toLowerCase().replace(/[?!.,]/g, ' ')
  const age = req.context?.age ?? null
  const base = { lang, mode: 'offline' as const, checked: true }

  const guard = (age !== null && age <= TEEN_MAX_AGE && has(q, WEIGHT_LOSS) ? 'teen_weight' : null) ?? GUARDS.find(([, words]) => has(q, words))?.[0] ?? null
  if (guard) {
    const sources: CoachSource[] = guard === 'condition' ? [{ type: 'reference', id: 'who_healthy_diet', title: 'WHO Healthy diet fact sheet', source: 'WHO', verified: true, url: WHO_URL }] : []
    return { ...base, answer: t(`coach.g.${guard}` as TKey), sources, guardrail: guard }
  }

  const refs = targetsFor(refRows, age ?? 18, 'unspecified').filter((r) => r.status === 'sourced' && has(q, REF_WORDS[r.nutrient] ?? []))
  let named = findFoods(q, foods)
  const meal = (req.context?.meal_food_ids ?? []).map((id) => foods.find((f) => f.id === id)).filter((f): f is Food => !!f)
  // Same rule as the backend: meal foods join when the question is about the meal, or nothing else matched.
  if (meal.length && (has(q, MEAL_WORDS) || (!named.length && !refs.length))) named = [...meal, ...named.filter((f) => !meal.includes(f))]
  named = named.slice(0, 4)
  const showKcal = age === null || age > TEEN_MAX_AGE || has(q, CALORIE_WORDS)
  const lines: string[] = []
  const sources: CoachSource[] = []
  if (named.length) {
    lines.push(t('coach.fromTable'))
    for (const f of named) {
      const kcal = Math.round((f.kcal * f.serving_grams) / 100)
      const protein = Math.round((f.protein_g * f.serving_grams * 10) / 100) / 10
      lines.push(`• ${t(showKcal ? 'coach.foodLineKcal' : 'coach.foodLine', { name: foodName(f, lang), g: f.serving_grams, kcal, p: protein })}`)
      sources.push({ type: 'food', id: f.id, title: `${f.name_bn} / ${f.name_en}`, source: f.source, verified: f.verified, url: f.source_url })
    }
    if (named.some((f) => !f.verified)) lines.push(t('coach.unverified'))
  }
  if (refs.length) {
    lines.push(t('coach.who'))
    for (const r of refs) {
      const key = r.unit === '% of daily energy' ? 'ref.limitPctEnergy' : r.type === 'target' ? 'ref.targetGDay' : 'ref.limitGDay'
      lines.push(`• ${t(`nut.${r.nutrient}` as TKey)}: ${t(key as TKey, { v: r.value ?? 0 })}`)
      sources.push({ type: 'reference', id: r.nutrient, title: t(`nut.${r.nutrient}` as TKey), source: 'WHO', verified: true, url: r.url })
    }
  }
  if (!lines.length) lines.push(t('coach.noData'))
  return { ...base, answer: lines.join('\n'), sources, guardrail: null }
}
