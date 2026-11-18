// WELLBEING CHECK-IN: PLACEHOLDER CONFIGURATION.
//
// The questions below MUST be written and approved by a qualified psychologist or dietitian.
// Engineers must not add, reword or translate questions. Until `questions` is filled in and
// `reviewedBy` is set, the app shows "not set up yet" and never asks anything.
//
// When any chosen option has `flag: true`, the app hides meal tracking and shows the support card
// (text in support.config.ts).

import type { Lang } from '@/lib/i18n'

export type LocalText = Record<Lang, string>

export interface WellbeingOption {
  id: string
  text: LocalText
  /** Choosing this option hides tracking and shows the support card. */
  flag: boolean
}

export interface WellbeingQuestion {
  id: string
  text: LocalText
  options: WellbeingOption[]
}

export interface WellbeingConfig {
  version: string
  /** Name and qualification of the reviewer. null = not reviewed: the check-in stays off. */
  reviewedBy: string | null
  /** How often to offer the check-in, in days. */
  intervalDays: number
  questions: WellbeingQuestion[]
}

export const WELLBEING_CONFIG: WellbeingConfig = {
  version: '0-placeholder',
  reviewedBy: null,
  intervalDays: 28,
  questions: [],
}
