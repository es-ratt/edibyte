import { describe, expect, it } from 'vitest'
import { toGrams } from '@/lib/check/engine'
import type { FoodBrief } from '@/lib/check/types'
import { explicitUnit, mealTypeFor } from './draft'

const biscuit = { serving_grams: 30, piece_grams: 7.5 } as FoodBrief
const bhat = { serving_grams: 250, piece_grams: null } as FoodBrief

describe('explicit units (what you see is what is computed)', () => {
  it('a bare count of a countable food means pieces', () => {
    expect(explicitUnit(biscuit, 2, null)).toBe('piece')
    expect(toGrams(biscuit, 2, 'piece')[0]).toBe(15)
  })
  it('no amount, or a non-countable food, means one serving', () => {
    expect(explicitUnit(biscuit, null, null)).toBe('serving')
    expect(explicitUnit(bhat, 2, null)).toBe('serving')
    // Regression: "1 serving" of biscuits is 30 g, not one 7.5 g biscuit.
    expect(toGrams(biscuit, 1, 'serving')[0]).toBe(30)
  })
  it('keeps a unit the user or parser gave', () => {
    expect(explicitUnit(bhat, 300, 'g')).toBe('g')
  })
})

describe('meal type from time of day', () => {
  it('picks a sensible default', () => {
    expect(mealTypeFor(new Date(2026, 0, 1, 8))).toBe('breakfast')
    expect(mealTypeFor(new Date(2026, 0, 1, 13))).toBe('lunch')
    expect(mealTypeFor(new Date(2026, 0, 1, 17))).toBe('snack')
    expect(mealTypeFor(new Date(2026, 0, 1, 21))).toBe('dinner')
  })
})

describe('unmatched phrases are never dropped silently', () => {
  const dal = { id: 'dal', name_bn: 'ডাল', name_en: 'Dal', name_bl: 'Dal', category: 'lentil', serving_desc_bn: '', serving_desc_en: '', serving_grams: 150, piece_grams: null, verified: false }

  it('resolving keeps the amount; dismissing removes it', async () => {
    const { useDraft } = await import('./draft')
    useDraft.getState().start([], false, [
      { key: 'u1', rawName: 'begun bhorta', quantity: 200, unit: 'g', suggestions: [] },
      { key: 'u2', rawName: 'xyz', quantity: null, unit: null, suggestions: [] },
    ])
    useDraft.getState().resolveUnmatched('u1', dal)
    expect(useDraft.getState().rows).toEqual([expect.objectContaining({ food: dal, quantity: 200, unit: 'g', rawName: 'begun bhorta' })])
    useDraft.getState().resolveUnmatched('u2', null)
    expect(useDraft.getState().unmatched).toEqual([])
    expect(useDraft.getState().rows).toHaveLength(1)
  })
})
