import { beforeEach, describe, expect, it } from 'vitest'
import { _resetConnectionForTests, addMeal, clearAllData, DB_NAME, getProfile, getSetting, listMeals, listPlans, saveProfile, savePlan, setSetting } from './index'

beforeEach(async () => {
  await _resetConnectionForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
})

describe('local storage (IndexedDB)', () => {
  it('returns the fallback for an unknown setting and stores values', async () => {
    expect(await getSetting('lang', 'bn')).toBe('bn')
    await setSetting('lang', 'en')
    expect(await getSetting('lang', 'bn')).toBe('en')
  })

  it('stores the profile with an updatedAt stamp', async () => {
    expect(await getProfile()).toBeNull()
    await saveProfile({ age: 15 })
    const p = await getProfile()
    expect(p?.age).toBe(15)
    expect(typeof p?.updatedAt).toBe('string')
  })

  it('lists meals inside a date range only', async () => {
    await addMeal({ eatenAt: '2026-11-17T13:00:00Z', items: [{ foodId: 'bhat', grams: 250, confidence: 'high' }] })
    await addMeal({ eatenAt: '2026-11-19T13:00:00Z', items: [] })
    const hits = await listMeals('2026-11-17T00:00:00Z', '2026-11-18T00:00:00Z')
    expect(hits.map((m) => m.eatenAt)).toEqual(['2026-11-17T13:00:00Z'])
  })

  it('"delete all my data" empties every store', async () => {
    await setSetting('lang', 'en')
    await saveProfile({ age: 15 })
    await addMeal({ eatenAt: '2026-11-17T13:00:00Z', items: [] })
    await savePlan({ id: 'w1', kind: 'week', startsOn: '2026-11-16' })
    expect(await clearAllData()).toBe(true)
    expect(await getProfile()).toBeNull()
    expect(await getSetting('lang', 'bn')).toBe('bn')
    expect(await listMeals('2000-01-01', '2100-01-01')).toEqual([])
    expect(await listPlans()).toEqual([])
  })
})
