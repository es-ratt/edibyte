import { createLiveApi } from './live'
import type { Api } from './types'

export * from './types'

let demoApi: Promise<Api> | null = null

/** Loads the demo adapter (food table CSV, check engine, demo coach) on first use, once. */
function demo(): Promise<Api> {
  demoApi ??= import('./demo').then((m) => m.createDemoApi())
  return demoApi
}

/**
 * Demo API whose code is not part of the first page load: each method loads the adapter and then
 * behaves exactly like createDemoApi().
 */
function createLazyDemoApi(): Api {
  return {
    mode: 'demo',
    health: async () => (await demo()).health(),
    dataStatus: async () => (await demo()).dataStatus(),
    searchFoods: async (query, lang) => (await demo()).searchFoods(query, lang),
    referenceTargets: async (summary) => (await demo()).referenceTargets(summary),
    parseMeal: async (text, lang) => (await demo()).parseMeal(text, lang),
    parseImage: async (photo, lang, signal) => (await demo()).parseImage(photo, lang, signal),
    checkMeal: async (req) => (await demo()).checkMeal(req),
    suggestion: async (summary) => (await demo()).suggestion(summary),
    planCheck: async (slots, profile) => (await demo()).planCheck(slots, profile),
    sendEvents: async (sessionId, events) => (await demo()).sendEvents(sessionId, events),
    sendFeedback: async (sessionId, foodIds) => (await demo()).sendFeedback(sessionId, foodIds),
    validation: async () => (await demo()).validation(),
    coach: async (req) => (await demo()).coach(req),
  }
}

/**
 * Demo mode when VITE_USE_MOCK_DATA=true, or when no backend URL is configured at all
 * (a static host must never point at a localhost default it cannot reach).
 */
export function selectApi(env: { VITE_API_BASE_URL?: string; VITE_USE_MOCK_DATA?: string }): Api {
  const base = env.VITE_API_BASE_URL?.trim()
  if (env.VITE_USE_MOCK_DATA === 'true' || !base) return createLazyDemoApi()
  return createLiveApi(base)
}

export const api: Api = selectApi(import.meta.env)
