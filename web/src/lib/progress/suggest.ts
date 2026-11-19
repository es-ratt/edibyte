// Weekly suggestion, chosen by rules from backend/data/tips.csv (mirrors backend/app/suggestions.py).
// Used by the demo adapter; the live app calls POST /suggestions. Both run the shared cases in
// backend/eval/suggestion_cases.json.

import { parseCsv } from '@/lib/targets'
import type { HabitSummary } from './habits'

export const MIN_MEALS = 3

export interface WeeklyTip {
  id: string
  trigger: string
  priority: number
  text_bn: string
  text_en: string
  text_bl: string
  source: string
  source_url: string | null
  reviewed_by: string | null
  active: boolean
}

export interface SuggestionResult {
  tip: { id: string; text_bn: string; text_en: string; text_bl: string; source: string; source_url: string | null; reviewed: boolean } | null
  reason: string | null
}

const METRICS = new Set(['meals_logged', 'days_logged', 'veg_fruit_share', 'protein_share', 'sugary_drinks', 'fried_meals', 'packaged_snacks', 'breakfast_share'])
const OPS: Record<string, (a: number, b: number) => boolean> = {
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
  '==': (a, b) => a === b,
}

export function parseTrigger(trigger: string): [keyof HabitSummary, string, number] {
  const parts = trigger.trim().split(/\s+/)
  if (parts.length !== 3 || !METRICS.has(parts[0]) || !(parts[1] in OPS) || Number.isNaN(Number(parts[2]))) throw new Error(`Bad trigger: ${trigger}`)
  return [parts[0] as keyof HabitSummary, parts[1], Number(parts[2])]
}

export function parseTipsCsv(text: string): WeeklyTip[] {
  const [header, ...lines] = parseCsv(text)
  const tips = lines.map((f) => {
    const r = Object.fromEntries(header.map((h, i) => [h, (f[i] ?? '').trim()]))
    parseTrigger(r.trigger)
    return {
      id: r.id, trigger: r.trigger, priority: Number(r.priority), text_bn: r.text_bn, text_en: r.text_en, text_bl: r.text_bl,
      source: r.source, source_url: r.source_url || null, reviewed_by: r.reviewed_by || null, active: r.active.toLowerCase() === 'true',
    } // fmt: skip
  })
  return tips.sort((a, b) => a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

export function chooseTip(tips: WeeklyTip[], summary: HabitSummary): WeeklyTip | null {
  if (summary.meals_logged < MIN_MEALS) return null
  for (const tip of tips) {
    if (!tip.active) continue
    const [metric, op, value] = parseTrigger(tip.trigger)
    if (OPS[op](summary[metric], value)) return tip
  }
  return null
}

export function suggestionFor(tips: WeeklyTip[], summary: HabitSummary): SuggestionResult {
  const tip = chooseTip(tips, summary)
  if (!tip) return { tip: null, reason: summary.meals_logged < MIN_MEALS ? 'not_enough_meals' : 'no_match' }
  const { id, text_bn, text_en, text_bl, source, source_url } = tip
  return { tip: { id, text_bn, text_en, text_bl, source, source_url, reviewed: tip.reviewed_by !== null }, reason: null }
}
