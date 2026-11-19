// The demo engine must give exactly the same answer as the Python engine.
// Regenerate fixtures after changing backend/app/check.py:  cd backend && python -m eval.export_check_fixtures
import { describe, expect, it } from 'vitest'
import foodsCsv from '../../../../backend/data/foods_seed.csv?raw'
import refCsv from '../../../../backend/data/reference_targets.csv?raw'
import { parseReferenceCsv } from '@/lib/targets'
import { checkMeal, pyRound } from './engine'
import fixtures from './fixtures.json'
import { parseFoodsCsv } from './foods'
import type { CheckRequest, CheckResponse } from './types'

const foods = parseFoodsCsv(foodsCsv)
const refs = parseReferenceCsv(refCsv)

describe('pyRound matches Python round()', () => {
  it('rounds halves to even', () => {
    expect(pyRound(0.5)).toBe(0)
    expect(pyRound(1.5)).toBe(2)
    expect(pyRound(2.5)).toBe(2)
    expect(pyRound(12.25, 1)).toBe(12.2)
    expect(pyRound(487.5)).toBe(488)
    // Not real ties: the double is just below the half (values checked against CPython).
    expect(pyRound(5.55, 1)).toBe(5.5)
    expect(pyRound(2.675, 2)).toBe(2.67)
  })
})

describe('demo engine parity with backend/app/check.py', () => {
  it('loads all foods from the shared CSV', () => {
    expect(foods.length).toBeGreaterThanOrEqual(48)
  })
  it.each((fixtures as { request: CheckRequest; response: CheckResponse }[]).map((f, i) => [i, f] as const))(
    'fixture %i gives the same response',
    (_i, f) => {
      expect(checkMeal(f.request, foods, refs)).toEqual(f.response)
    },
  )
})
