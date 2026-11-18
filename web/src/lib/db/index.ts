// Local-first storage (IndexedDB via idb). Profile, meals, plans and settings live on this device.
// Nothing here is sent to the server unless a feature explicitly sends the minimum it needs.
// Every call is wrapped so a blocked/private-mode IndexedDB never crashes the app: reads fall back
// to defaults, writes are skipped.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export const DB_NAME = 'edibyte'
export const DB_VERSION = 1

/** Filled in by Phase 2 (profile) and Phase 3 (meals). Kept open-ended on purpose. */
export interface StoredProfile {
  updatedAt: string
  [field: string]: unknown
}

export interface StoredMeal {
  id?: number
  /** ISO date-time of the meal. */
  eatenAt: string
  /** Confirmed items only: food ids + grams + confidence. Never photos, never typed text. */
  items: { foodId: string; grams: number; confidence: 'high' | 'medium' | 'low' }[]
  [field: string]: unknown
}

export interface StoredPlan {
  id: string
  kind: 'day' | 'week' | 'month'
  startsOn: string
  [field: string]: unknown
}

export interface QueuedEvent {
  id?: number
  name: string
  at: string
  /** Only for "item_wrong" feedback: the food id. Never user text. */
  foodId?: string
}

interface EdiByteDB extends DBSchema {
  profile: { key: string; value: StoredProfile }
  meals: { key: number; value: StoredMeal; indexes: { byDate: string } }
  plans: { key: string; value: StoredPlan; indexes: { byStart: string } }
  settings: { key: string; value: unknown }
  events: { key: number; value: QueuedEvent }
}

export type StoreName = 'profile' | 'meals' | 'plans' | 'settings' | 'events'
export const STORES: StoreName[] = ['profile', 'meals', 'plans', 'settings', 'events']

let dbPromise: Promise<IDBPDatabase<EdiByteDB>> | null = null

function db(): Promise<IDBPDatabase<EdiByteDB>> {
  dbPromise ??= openDB<EdiByteDB>(DB_NAME, DB_VERSION, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        d.createObjectStore('profile')
        d.createObjectStore('meals', { keyPath: 'id', autoIncrement: true }).createIndex('byDate', 'eatenAt')
        d.createObjectStore('plans', { keyPath: 'id' }).createIndex('byStart', 'startsOn')
        d.createObjectStore('settings')
        d.createObjectStore('events', { keyPath: 'id', autoIncrement: true })
      }
    },
  }).catch((error: unknown) => {
    dbPromise = null
    throw error
  })
  return dbPromise
}

/** Some private modes and old WebViews never answer an IndexedDB request. Give up after this. */
export const DB_TIMEOUT_MS = 2500

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('IndexedDB timed out')), ms))
}

async function safe<T>(fn: (d: IDBPDatabase<EdiByteDB>) => Promise<T>, fallback: T): Promise<T> {
  try {
    return await Promise.race([db().then(fn), timeout(DB_TIMEOUT_MS)])
  } catch {
    return fallback
  }
}

// --- settings -------------------------------------------------------------------

export function getSetting<T>(key: string, fallback: T): Promise<T> {
  return safe(async (d) => {
    const v = await d.get('settings', key)
    return v === undefined ? fallback : (v as T)
  }, fallback)
}

export function setSetting(key: string, value: unknown): Promise<void> {
  return safe(async (d) => void (await d.put('settings', value, key)), undefined)
}

// --- profile --------------------------------------------------------------------

const PROFILE_KEY = 'me'

export function getProfile(): Promise<StoredProfile | null> {
  return safe(async (d) => (await d.get('profile', PROFILE_KEY)) ?? null, null)
}

export function saveProfile(profile: Omit<StoredProfile, 'updatedAt'>): Promise<void> {
  const value: StoredProfile = { ...profile, updatedAt: new Date().toISOString() }
  return safe(async (d) => void (await d.put('profile', value, PROFILE_KEY)), undefined)
}

// --- meals ----------------------------------------------------------------------

export function addMeal(meal: Omit<StoredMeal, 'id'>): Promise<number | null> {
  return safe(async (d) => (await d.add('meals', meal as StoredMeal)) as number, null)
}

/** Meals with eatenAt in [fromIso, toIso). */
export function listMeals(fromIso: string, toIso: string): Promise<StoredMeal[]> {
  return safe((d) => d.getAllFromIndex('meals', 'byDate', IDBKeyRange.bound(fromIso, toIso, false, true)), [])
}

// --- plans ----------------------------------------------------------------------

export function savePlan(plan: StoredPlan): Promise<void> {
  return safe(async (d) => void (await d.put('plans', plan)), undefined)
}

export function listPlans(): Promise<StoredPlan[]> {
  return safe((d) => d.getAll('plans'), [])
}

// --- anonymous event queue (Phase 8 sends it; names only, never user text) ---------

export function queueEvent(name: string): Promise<void> {
  return safe(async (d) => void (await d.add('events', { name, at: new Date().toISOString() })), undefined)
}

/** "Was this wrong?" on a recognised item: stores the food id only (accuracy measurement, Phase 8). */
export function addWrongItemFeedback(foodId: string): Promise<void> {
  return safe(async (d) => void (await d.add('events', { name: 'item_wrong', at: new Date().toISOString(), foodId })), undefined)
}

export function listEvents(): Promise<QueuedEvent[]> {
  return safe((d) => d.getAll('events'), [])
}

// --- delete everything ------------------------------------------------------------

/** "Delete all my data": empties every local store. Returns false if storage was unavailable. */
export function clearAllData(): Promise<boolean> {
  return safe(async (d) => {
    const tx = d.transaction(STORES, 'readwrite')
    await Promise.all([...STORES.map((s) => tx.objectStore(s).clear()), tx.done])
    return true
  }, false)
}

/** Test helper: close and forget the cached connection so the database can be deleted. */
export async function _resetConnectionForTests(): Promise<void> {
  const pending = dbPromise
  dbPromise = null
  if (pending) (await pending.catch(() => null))?.close()
}
