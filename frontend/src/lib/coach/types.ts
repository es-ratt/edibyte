// Mirrors backend CoachRequest / CoachResponse (app/schemas.py).

import type { Lang } from '@/lib/i18n'

export interface CoachContext {
  age: number | null
  goal: 'balanced' | 'energy' | 'muscle' | 'maintain' | null
  diet: 'any' | 'vegetarian' | 'no_beef' | null
  meal_food_ids: string[]
  verdict_codes: string[]
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface CoachRequest {
  question: string
  lang: Lang
  history: ChatTurn[]
  context: CoachContext | null
}

export interface CoachSource {
  type: 'food' | 'tip' | 'reference'
  id: string
  title: string
  source: string
  verified: boolean
  url: string | null
}

export interface CoachAnswer {
  answer: string
  sources: CoachSource[]
  lang: Lang
  mode: 'ai' | 'offline'
  guardrail: string | null
  checked: boolean
}

/** Guardrails whose answer is a health/allergy notice (terracotta card). */
export const MEDICAL_GUARDRAILS = new Set(['allergy', 'condition', 'medical'])
