import { describe, expect, it } from 'vitest'
import { DEMO_SOURCE } from './demo'
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
  it('never reports sample data as verified', async () => {
    const status = await selectApi({}).dataStatus()
    expect(status.foods_verified).toBe(0)
    expect(status.sources[0].source).toBe(DEMO_SOURCE)
  })
  it('searches foods by Banglish id, English or Bangla name', async () => {
    const api = selectApi({})
    expect((await api.searchFoods('fuchka', 'banglish')).map((f) => f.id)).toEqual(['fuchka'])
    expect((await api.searchFoods('ভাত', 'bn')).map((f) => f.id)).toEqual(['bhat'])
  })
})
