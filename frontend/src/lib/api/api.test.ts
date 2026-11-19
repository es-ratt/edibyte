import { describe, expect, it } from 'vitest'
import { demoParse } from './demo'
import { selectApi } from './index'

describe('API selection', () => {
  it('uses the demo adapter when no backend URL is set (static host)', () => {
    expect(selectApi({}).mode).toBe('demo')
    expect(selectApi({ VITE_API_BASE_URL: '  ' }).mode).toBe('demo')
  })
  it('uses the demo adapter when mock data is forced', () => {
    expect(selectApi({ VITE_API_BASE_URL: 'https://api.example.org', VITE_USE_MOCK_DATA: 'true' }).mode).toBe('demo')
  })
  it('uses the live client when a backend URL is set', () => {
    expect(selectApi({ VITE_API_BASE_URL: 'https://api.example.org', VITE_USE_MOCK_DATA: 'false' }).mode).toBe('live')
  })
})

describe('demo adapter', () => {
  it('reports the shared food table honestly (no row verified yet)', async () => {
    const status = await selectApi({}).dataStatus()
    expect(status.foods_total).toBeGreaterThanOrEqual(48)
    expect(status.foods_verified).toBe(0)
  })
  it('parses text with the longest name first and keeps a leading count', () => {
    const r = demoParse('2 ruti ar dim bhaji')
    expect(r.items.map((i) => i.food.id)).toEqual(['dim_bhaji', 'ruti'])
    expect(r.items.find((i) => i.food.id === 'ruti')?.quantity).toBe(2)
  })
  it('returns a labelled sample meal for a photo, with one unsure match', async () => {
    const r = await selectApi({}).parseImage(new Blob(['x']), 'en')
    expect(r.warnings).toContain('demo_sample')
    expect(r.items.some((i) => i.uncertain)).toBe(true)
  })
  it('searches foods by Banglish id, English or Bangla name', async () => {
    const api = selectApi({})
    expect((await api.searchFoods('fuchka', 'banglish')).map((f) => f.id)).toEqual(['fuchka'])
    expect((await api.searchFoods('ভাত', 'bn')).map((f) => f.id)).toEqual(['bhat'])
  })
})
