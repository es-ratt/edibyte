// Anonymous adoption events. Queued on the device (IndexedDB) and sent ONLY in live mode when the
// user allows it (Settings, on by default). Names and numbers only: never text, foods or profile
// data. Sent events are deleted from the device. In demo mode nothing leaves the browser.

import type { Api } from '@/lib/api'
import { deleteEvents, getSetting, listEvents, listMeals, queueEvent, setSetting } from '@/lib/db'
import { addDays, flagsOf, summarizeWeek, weekStart } from '@/lib/progress/habits'

const DAY_MS = 86_400_000

export async function sessionId(): Promise<string> {
  let sid = await getSetting<string>('sid', '')
  if (!sid) {
    sid = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    await setSetting('sid', sid)
  }
  return sid
}

/** Once per install: day-3 and day-7 return markers (days since the first open). */
export async function recordReturns(now: Date = new Date()): Promise<void> {
  const first = await getSetting<string>('firstOpen', '')
  if (!first) {
    await setSetting('firstOpen', now.toISOString())
    return
  }
  const days = (now.getTime() - new Date(first).getTime()) / DAY_MS
  for (const [mark, name] of [[3, 'day3_return'], [7, 'day7_return']] as const) {
    if (days >= mark && !(await getSetting<boolean>(name, false))) {
      await setSetting(name, true)
      await queueEvent(name)
    }
  }
}

/** Once per week: last full week's habit numbers (baseline vs later weeks = habit change proxy). */
export async function recordWeeklyHabits(mealsPerDay: number, now: Date = new Date()): Promise<void> {
  const first = await getSetting<string>('firstOpen', '')
  if (!first) return
  const lastWeek = addDays(weekStart(now), -7)
  const key = `habitsSent:${lastWeek.toISOString().slice(0, 10)}`
  if (await getSetting<boolean>(key, false)) return
  const meals = (await listMeals(lastWeek.toISOString(), weekStart(now).toISOString())).map(flagsOf)
  const w = summarizeWeek(meals, lastWeek, mealsPerDay)
  if (w.meals_logged < 3) return
  const week = Math.max(0, Math.floor((lastWeek.getTime() - weekStart(new Date(first)).getTime()) / (7 * DAY_MS)))
  await queueEvent('habit_veg_share', { value: w.veg_fruit_share, week })
  await queueEvent('habit_sugary_drinks', { value: w.sugary_drinks, week })
  await setSetting(key, true)
}

/** Send queued events (live mode + permission only); delete what was sent. */
export async function flushEvents(api: Api, allowed: boolean): Promise<number> {
  if (api.mode !== 'live' || !allowed) return 0
  const queued = await listEvents()
  if (!queued.length) return 0
  const sid = await sessionId()
  const wrong = queued.filter((e) => e.name === 'item_wrong' && e.foodId)
  const usage = queued.filter((e) => e.name !== 'item_wrong')
  let sent = 0
  try {
    for (let i = 0; i < usage.length; i += 50) {
      const chunk = usage.slice(i, i + 50)
      await api.sendEvents(sid, chunk.map((e) => ({ name: e.name, value: e.value ?? null, week: e.week ?? null })))
      await deleteEvents(chunk.map((e) => e.id!))
      sent += chunk.length
    }
    if (wrong.length) {
      await api.sendFeedback(sid, wrong.map((e) => e.foodId!))
      await deleteEvents(wrong.map((e) => e.id!))
      sent += wrong.length
    }
  } catch {
    // Offline or server asleep: keep the rest queued for next time.
  }
  return sent
}
