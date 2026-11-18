import { describe, expect, it } from 'vitest'
import { allAnswered, checkInAvailable, isFlagged } from './wellbeing'
import { WELLBEING_CONFIG, type WellbeingConfig } from './wellbeing.config'

const t = (s: string) => ({ bn: s, en: s, banglish: s })

// Structural test fixture only. Not real questions.
const FIXTURE: WellbeingConfig = {
  version: 'test',
  reviewedBy: 'Test reviewer',
  intervalDays: 28,
  questions: [
    { id: 'q1', text: t('Q1'), options: [{ id: 'a', text: t('A'), flag: false }, { id: 'b', text: t('B'), flag: true }] },
    { id: 'q2', text: t('Q2'), options: [{ id: 'c', text: t('C'), flag: false }] },
  ],
}

describe('wellbeing check-in placeholder', () => {
  it('ships with no questions and stays off until reviewed', () => {
    expect(WELLBEING_CONFIG.questions).toEqual([])
    expect(WELLBEING_CONFIG.reviewedBy).toBeNull()
    expect(checkInAvailable(WELLBEING_CONFIG)).toBe(false)
  })
  it('stays off when questions exist but nobody reviewed them', () => {
    expect(checkInAvailable({ ...FIXTURE, reviewedBy: null })).toBe(false)
    expect(checkInAvailable(FIXTURE)).toBe(true)
  })
  it('flags when a flagged option is chosen', () => {
    expect(isFlagged(FIXTURE, { q1: 'a', q2: 'c' })).toBe(false)
    expect(isFlagged(FIXTURE, { q1: 'b', q2: 'c' })).toBe(true)
  })
  it('knows when every question is answered', () => {
    expect(allAnswered(FIXTURE, { q1: 'a' })).toBe(false)
    expect(allAnswered(FIXTURE, { q1: 'a', q2: 'c' })).toBe(true)
  })
})
