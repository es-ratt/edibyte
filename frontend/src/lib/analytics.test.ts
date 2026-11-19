import { beforeEach, describe, expect, it, vi } from 'vitest'
import { selectApi, type Api } from '@/lib/api'
import { _resetConnectionForTests, addWrongItemFeedback, DB_NAME, getSetting, listEvents, queueEvent, setSetting } from '@/lib/db'
import { flushEvents, recordReturns } from './analytics'

beforeEach(async () => {
  await _resetConnectionForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
})

function liveApi() {
  const api = selectApi({ VITE_API_BASE_URL: 'https://api.example.org', VITE_USE_MOCK_DATA: 'false' })
  const sendEvents = vi.fn(async () => undefined)
  const sendFeedback = vi.fn(async () => undefined)
  return { api: { ...api, sendEvents, sendFeedback } as Api, sendEvents, sendFeedback }
}

describe('anonymous events', () => {
  it('never sends anything in demo mode', async () => {
    await queueEvent('meal_logged', { value: 30 })
    expect(await flushEvents(selectApi({}), true)).toBe(0)
    expect(await listEvents()).toHaveLength(1)
  })

  it('never sends when the user turned sharing off', async () => {
    const { api, sendEvents } = liveApi()
    await queueEvent('meal_logged')
    expect(await flushEvents(api, false)).toBe(0)
    expect(sendEvents).not.toHaveBeenCalled()
  })

  it('sends names and numbers only, routes wrong-item taps to feedback, then deletes them', async () => {
    const { api, sendEvents, sendFeedback } = liveApi()
    await queueEvent('meal_logged', { value: 42 })
    await queueEvent('habit_veg_share', { value: 0.5, week: 2 })
    await addWrongItemFeedback('dim_bhaji')
    expect(await flushEvents(api, true)).toBe(3)
    const [, events] = sendEvents.mock.calls[0] as unknown as [string, unknown[]]
    expect(events).toEqual([
      { name: 'meal_logged', value: 42, week: null },
      { name: 'habit_veg_share', value: 0.5, week: 2 },
    ])
    expect(sendFeedback).toHaveBeenCalledWith(expect.any(String), ['dim_bhaji'])
    expect(await listEvents()).toEqual([])
  })

  it('keeps events queued when the server is unreachable', async () => {
    const { api } = liveApi()
    api.sendEvents = vi.fn(async () => {
      throw new Error('offline')
    })
    await queueEvent('coach_asked')
    expect(await flushEvents(api, true)).toBe(0)
    expect(await listEvents()).toHaveLength(1)
  })

  it('records day-3 and day-7 returns once', async () => {
    const start = new Date(2026, 10, 1)
    await recordReturns(start) // first open
    await recordReturns(new Date(2026, 10, 9))
    await recordReturns(new Date(2026, 10, 10))
    expect((await listEvents()).map((e) => e.name)).toEqual(['day3_return', 'day7_return'])
    expect(await getSetting('day7_return', false)).toBe(true)
  })

  it('uses one random session id per install', async () => {
    const { api, sendEvents } = liveApi()
    await setSetting('sid', '')
    await queueEvent('photo_used')
    await flushEvents(api, true)
    const [sid] = sendEvents.mock.calls[0] as unknown as [string]
    expect(sid).toMatch(/^[A-Za-z0-9-]{8,}$/)
  })
})
