import { describe, expect, it } from 'vitest'
import { fitWithin, MAX_SIDE_PX } from './image'

describe('fitWithin', () => {
  it('scales the longest side down to the limit', () => {
    expect(fitWithin(4000, 3000, MAX_SIDE_PX)).toEqual({ width: 1280, height: 960 })
    expect(fitWithin(3000, 4000, MAX_SIDE_PX)).toEqual({ width: 960, height: 1280 })
  })
  it('never upscales a small photo', () => {
    expect(fitWithin(800, 600, MAX_SIDE_PX)).toEqual({ width: 800, height: 600 })
  })
})
