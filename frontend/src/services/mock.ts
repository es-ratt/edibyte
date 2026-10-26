// MOCK DATA for offline UI work only (VITE_USE_MOCK_DATA=true).
// Values are invented placeholders. The UI shows a "Mock data" banner whenever this is active.

import type { Api } from './api'
import { detectLang } from '@/lib/detectLang'
import type { FoodBrief, Nutrients, Profile, ReportItemIn, Targets } from '@/types/api'

const MOCK_SOURCE = 'MOCK DATA - not real'

const foods = [
  { id: 'bhat', name_bn: 'ভাত', name_en: 'Rice (mock)', name_bl: 'Bhat', category: 'grain', keys: ['bhat', 'ভাত', 'rice'], g: 250, kcal: 130, p: 2.7, c: 28, f: 0.3 },
  { id: 'dal', name_bn: 'ডাল', name_en: 'Dal (mock)', name_bl: 'Dal', category: 'lentil', keys: ['dal', 'ডাল'], g: 150, kcal: 70, p: 4.5, c: 11, f: 1.2 },
  { id: 'dim', name_bn: 'ডিম', name_en: 'Egg (mock)', name_bl: 'Dim', category: 'egg', keys: ['dim', 'ডিম', 'egg'], g: 50, kcal: 155, p: 13, c: 1, f: 11 },
  { id: 'ruti', name_bn: 'রুটি', name_en: 'Ruti (mock)', name_bl: 'Ruti', category: 'grain', keys: ['ruti', 'রুটি', 'roti'], g: 40, kcal: 264, p: 9, c: 50, f: 3.5 },
]

const brief = (f: (typeof foods)[number]): FoodBrief => ({
  id: f.id, name_bn: f.name_bn, name_en: f.name_en, name_bl: f.name_bl, category: f.category,
  serving_desc_bn: '১ পরিবেশন', serving_desc_en: '1 serving', serving_grams: f.g, verified: false,
})

const delay = <T>(v: T, ms = 400) => new Promise<T>((r) => setTimeout(() => r(v), ms))

function targets(p: Profile): Targets {
  const bmr = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + (p.sex === 'male' ? 5 : p.sex === 'female' ? -161 : -78)
  const kcal = Math.max(1200, Math.round(bmr * 1.4))
  return { kcal, protein_g: Math.round(p.weight_kg), carbs_g: Math.round(kcal * 0.5 / 4), fat_g: Math.round(kcal * 0.28 / 9), fiber_g: 25, bmr: Math.round(bmr), tdee: Math.round(bmr * 1.4), floor_applied: false, floor_kcal: 1200 }
}

export const mockApi: Api = {
  health: () => delay({ status: 'ok', mode: 'offline', provider: 'mock', photo_enabled: false, foods: foods.length }, 200),
  parseMeal: (text, lang) => {
    const t = text.toLowerCase()
    const hit = foods.filter((f) => f.keys.some((k) => t.includes(k)))
    return delay({
      items: hit.map((f) => ({ raw_name: f.keys[0], food: brief(f), quantity: null, unit: null, grams: f.g, assumed: true, confidence: 1 })),
      unmatched: hit.length ? [] : [{ raw_name: text.slice(0, 30), quantity: null, unit: null, suggestions: foods.map(brief) }],
      normalized_text: t, lang, mode: 'offline', warnings: ['mock_data'],
    })
  },
  parseImage: () => Promise.reject(new Error('mock: photo disabled')),
  report: (items: ReportItemIn[], profile, lang) => {
    const rows = items.map((it) => {
      const f = foods.find((x) => x.id === it.food_id) ?? foods[0]
      const grams = (it.quantity ?? 1) * f.g
      const k = grams / 100
      const n: Nutrients = { kcal: Math.round(f.kcal * k), protein_g: +(f.p * k).toFixed(1), carbs_g: +(f.c * k).toFixed(1), fat_g: +(f.f * k).toFixed(1), fiber_g: 0 }
      return { food: brief(f), quantity: it.quantity, unit: it.unit, grams, assumed: it.quantity == null, nutrients: n, source: MOCK_SOURCE, fiber_known: false }
    })
    const totals = rows.reduce<Nutrients>((a, r) => ({ kcal: a.kcal + r.nutrients.kcal, protein_g: a.protein_g + r.nutrients.protein_g, carbs_g: a.carbs_g + r.nutrients.carbs_g, fat_g: a.fat_g + r.nutrients.fat_g, fiber_g: 0 }), { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 })
    const tg = targets(profile)
    const pct = (a: number, b: number) => Math.round((100 * a) / b)
    return delay({
      items: rows, totals, targets: tg,
      percent_of_target: { kcal: pct(totals.kcal, tg.kcal), protein_g: pct(totals.protein_g, tg.protein_g), carbs_g: pct(totals.carbs_g, tg.carbs_g), fat_g: pct(totals.fat_g, tg.fat_g), fiber_g: 0 },
      tips: [{ id: 'mock', text: 'Mock tip: this is placeholder text.', rule: 'mock', verified: false, source: MOCK_SOURCE }],
      swaps: [], swaps_note: 'no_price_data', has_unverified: true, profile_used: profile, lang, disclaimer: 'Mock data. Not medical advice.',
    })
  },
  coach: (q) => {
    const lang = detectLang(q)
    const text = q.toLowerCase()
    const hits = foods.filter((f) => f.keys.some((k) => text.includes(k)))
    const per = (f: (typeof foods)[number]) => ({ kcal: Math.round((f.kcal * f.g) / 100), p: +((f.p * f.g) / 100).toFixed(1) })
    const notice = {
      en: '(Demo mode: sample values, no server connected.)',
      bn: '(ডেমো মোড: নমুনা মান, সার্ভার যুক্ত নেই।)',
      banglish: '(Demo mode: sample value, server connect nei.)',
    }[lang]
    const disclaimer = {
      en: 'General nutrition information, not medical advice.',
      bn: 'এটি সাধারণ পুষ্টি তথ্য, চিকিৎসা পরামর্শ নয়।',
      banglish: 'Eta general nutrition information, medical advice na.',
    }[lang]
    let body: string
    if (hits.length) {
      const lines = hits.slice(0, 3).map((f) => {
        const v = per(f)
        if (lang === 'bn') return `• ${f.name_bn}: প্রায় ${v.kcal} ক্যালরি, ${v.p} গ্রাম প্রোটিন (১ পরিবেশন)`
        if (lang === 'banglish') return `• ${f.name_bl}: prai ${v.kcal} kcal, ${v.p} g protein (1 serving)`
        return `• ${f.name_en.replace(' (mock)', '')}: about ${v.kcal} kcal, ${v.p} g protein (1 serving)`
      })
      body = lines.join('\n')
    } else {
      body = {
        en: 'Try asking about rice, dal, egg or ruti, for example: "How much protein is in an egg?"',
        bn: 'ভাত, ডাল, ডিম বা রুটি নিয়ে জিজ্ঞেস করুন, যেমন: “একটা ডিমে কত প্রোটিন?”',
        banglish: 'Bhat, dal, dim ba ruti niye jiggesh korun, jemon: "Ekta dim e koto protein?"',
      }[lang]
    }
    return delay({ answer: `${body}\n\n${notice}\n${disclaimer}`, sources: [], lang, mode: 'offline', guardrail: null }, 600)
  },
  foods: (query = '') => delay(foods.filter((f) => !query || f.keys.some((k) => k.includes(query.toLowerCase()))).map((f) => ({
    ...brief(f), aliases: f.keys, kcal: f.kcal, protein_g: f.p, carbs_g: f.c, fat_g: f.f, fiber_g: null,
    price_bdt_estimate: null, price_date: null, price_source: null, tags: [], source: MOCK_SOURCE, source_url: null, notes: null,
  })), 150),
  demoProfiles: () => delay([
    { id: 'student_budget', name_bn: 'বাজেটে চলা শিক্ষার্থী', name_en: 'Student on a budget', name_bl: 'Budget e chola student', description_en: 'Mock', is_demo: true,
      profile: { goal: 'maintain', sex: 'female', age: 21, height_cm: 157, weight_kg: 50, activity: 'light', diet: 'any', daily_budget_bdt: 150 } },
    { id: 'muscle_gain', name_bn: 'পেশি বাড়াতে চাই', name_en: 'Muscle gain', name_bl: 'Muscle barate chai', description_en: 'Mock', is_demo: true,
      profile: { goal: 'gain_muscle', sex: 'male', age: 24, height_cm: 172, weight_kg: 68, activity: 'active', diet: 'any', daily_budget_bdt: 300 } },
  ]),
  targets: (p) => delay(targets(p), 100),
  dataStatus: () => delay({ foods_total: foods.length, foods_verified: 0, foods_with_price: 0, tips_total: 1, tips_verified: 0, sources: [{ source: MOCK_SOURCE, rows: foods.length }], nutrient_basis: 'per 100 g edible portion' }),
  evalResults: () => delay({ status: 'not_run', message: 'Not run yet' } as const),
  clearData: () => delay({ deleted: 0 }),
}
