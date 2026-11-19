// Reference targets and limits. Mirrors backend/app/reference.py.
// The demo adapter reads backend/data/reference_targets.csv itself (imported at build time), so a
// static host shows exactly the same sourced values as the API. There is no second copy of numbers.

import type { Sex } from '@/features/profile/model'

export const PENDING_SOURCE = 'awaiting dietitian-approved reference'
const MAX_AGE = 200

export type RefType = 'target' | 'limit'
export type RefStatus = 'sourced' | 'unavailable'

export interface ReferenceItem {
  nutrient: string
  type: RefType
  value: number | null
  unit: string
  status: RefStatus
  source: string
  url: string | null
  date: string | null
  note: string | null
}

export interface ReferenceTargets {
  age: number
  sex: Sex
  activity: string | null
  teen: boolean
  items: ReferenceItem[]
}

interface Row {
  nutrient: string
  ageMin: number
  ageMax: number
  sex: string
  value: number | null
  unit: string
  type: RefType
  source: string
  url: string | null
  date: string | null
}

/** Minimal RFC 4180 CSV parser (quoted fields, commas inside quotes, doubled quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      if (row.some((f) => f !== '')) rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  row.push(field)
  if (row.some((f) => f !== '')) rows.push(row)
  return rows
}

function parseGroup(group: string): [number, number, string] {
  const [band, sex = 'any'] = group.trim().split(/\s+/)
  if (band === 'all') return [0, MAX_AGE, sex]
  if (band.endsWith('+')) return [Number(band.slice(0, -1)), MAX_AGE, sex]
  const [lo, hi] = band.split('-').map(Number)
  return [lo, hi, sex]
}

export function parseReferenceCsv(text: string): Row[] {
  const [header, ...lines] = parseCsv(text)
  const col = (name: string) => header.indexOf(name)
  return lines.map((f) => {
    const [ageMin, ageMax, sex] = parseGroup(f[col('group')])
    const raw = f[col('value')].trim()
    return {
      nutrient: f[col('nutrient')].trim(),
      ageMin,
      ageMax,
      sex,
      value: raw ? Number(raw) : null,
      unit: f[col('unit')].trim(),
      type: f[col('type')].trim() as RefType,
      source: f[col('source')].trim(),
      url: f[col('url')].trim() || null,
      date: f[col('date')].trim() || null,
    }
  })
}

const width = (r: Row) => r.ageMax - r.ageMin
const specificity = (r: Row): [number, number] => [width(r), r.sex === 'any' ? 1 : 0]
const lessSpecific = (a: Row, b: Row) => {
  const [aw, as] = specificity(a)
  const [bw, bs] = specificity(b)
  return aw !== bw ? aw > bw : as > bs
}

export function targetsFor(rows: Row[], age: number, sex: Sex): ReferenceItem[] {
  const best = new Map<string, Row>()
  for (const r of rows) {
    if (age < r.ageMin || age > r.ageMax || !(r.sex === 'any' || r.sex === sex)) continue
    const cur = best.get(r.nutrient)
    if (!cur || lessSpecific(cur, r)) best.set(r.nutrient, r)
  }
  return [...best.values()].map((r) => {
    const sourced = r.value !== null && r.source !== PENDING_SOURCE
    return {
      nutrient: r.nutrient,
      type: r.type,
      value: sourced ? r.value : null,
      unit: r.unit,
      status: sourced ? 'sourced' : 'unavailable',
      source: r.source,
      url: r.url,
      date: r.date,
      note: sourced ? null : 'Target pending expert review: no dietitian-approved reference chosen yet.',
    }
  })
}
