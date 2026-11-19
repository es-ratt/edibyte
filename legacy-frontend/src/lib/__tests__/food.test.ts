import { describe, expect, it } from 'vitest'
import { pieceWeightUnknown, previewGrams } from '@/lib/food'
import type { FoodBrief } from '@/types/api'

const base = { name_bn: '', name_en: '', name_bl: '', category: '', serving_desc_bn: '', serving_desc_en: '', verified: false }
const fuchka: FoodBrief = { ...base, id: 'fuchka', serving_grams: 150, piece_grams: null }
const biscuit: FoodBrief = { ...base, id: 'biscuit', serving_grams: 30, piece_grams: 7.5 }
const bhat: FoodBrief = { ...base, id: 'bhat', serving_grams: 250, piece_grams: null }

describe('previewGrams (mirrors backend to_grams)', () => {
  it('does not multiply a piece count by a plate-sized serving', () => {
    expect(previewGrams(fuchka, 10, 'piece')).toBe(150)
    expect(pieceWeightUnknown(fuchka, 10, 'piece')).toBe(true)
  })
  it('uses the piece weight when it is known', () => {
    expect(previewGrams(biscuit, 2, 'piece')).toBe(15)
    expect(previewGrams(biscuit, 2, null)).toBe(15)
    expect(pieceWeightUnknown(biscuit, 2, 'piece')).toBe(false)
  })
  it('keeps servings and fixed units as before', () => {
    expect(previewGrams(bhat, 2, 'plate')).toBe(500)
    expect(previewGrams(bhat, null, null)).toBe(250)
    expect(previewGrams(bhat, 300, 'g')).toBe(300)
    expect(pieceWeightUnknown(bhat, 2, 'plate')).toBe(false)
  })
})
