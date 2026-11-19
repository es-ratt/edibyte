import { describe, expect, it } from 'vitest'
import csvText from '../../../../backend/data/reference_targets.csv?raw'
import { parseCsv, parseReferenceCsv, targetsFor } from './index'

const rows = parseReferenceCsv(csvText)
const byNutrient = (age: number, sex: 'female' | 'male' | 'unspecified') =>
  Object.fromEntries(targetsFor(rows, age, sex).map((i) => [i.nutrient, i]))

describe('CSV parser', () => {
  it('handles quoted commas and doubled quotes', () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\n')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2', '3'],
    ])
  })
})

// Same expectations as backend/tests/test_reference_targets.py: both sides must agree.
describe('reference targets (same file as the backend)', () => {
  it('gives a teen only WHO limits that apply to children', () => {
    const out = byNutrient(15, 'female')
    expect(out.free_sugars).toMatchObject({ status: 'sourced', value: 10, unit: '% of daily energy', type: 'limit' })
    expect(out.saturated_fat.status).toBe('sourced')
    expect(out.trans_fat.status).toBe('sourced')
    expect(out.fruit_veg).toMatchObject({ status: 'sourced', type: 'target', value: 400 })
    expect(out.total_fat).toBeUndefined()
    expect(out.sodium).toMatchObject({ status: 'unavailable', value: null })
    for (const n of ['energy', 'protein', 'iron', 'zinc', 'calcium', 'fibre']) {
      expect(out[n]).toMatchObject({ status: 'unavailable', value: null })
    }
  })
  it('gives an adult the adult rows', () => {
    const out = byNutrient(19, 'male')
    expect(out.sodium).toMatchObject({ status: 'sourced', value: 2 })
    expect(out.total_fat.status).toBe('sourced')
  })
  it('every sourced value has a URL and date', () => {
    for (const r of rows.filter((x) => x.value !== null)) {
      expect(r.url).toMatch(/^https:\/\//)
      expect(r.date).toBeTruthy()
    }
  })
})
