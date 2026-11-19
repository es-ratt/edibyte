import { describe, expect, it } from 'vitest'
import { ageOn, birthYearOptions, GOALS, isTeen, parseOptionalNumber, parseProfile, summarize, teenModeOn } from './model'

const TODAY = new Date(2026, 10, 19) // 19 Nov 2026

describe('age and teen mode', () => {
  it('counts the birth month', () => {
    expect(ageOn(2011, 11, TODAY)).toBe(15)
    expect(ageOn(2011, 12, TODAY)).toBe(14)
  })
  it('forces teen mode under 18 and lets adults choose', () => {
    expect(isTeen(17)).toBe(true)
    expect(teenModeOn(15, false)).toBe(true)
    expect(teenModeOn(19, false)).toBe(false)
    expect(teenModeOn(19, true)).toBe(true)
  })
  it('offers birth years for ages 13 to 80 only', () => {
    const years = birthYearOptions(TODAY)
    expect(Math.min(...years.map((y) => ageOn(y, 1, TODAY)))).toBeGreaterThanOrEqual(13)
    expect(years[0]).toBe(2013)
  })
  it('has no weight-loss goal', () => {
    expect(GOALS).not.toContain('lose')
  })
})

describe('optional numbers', () => {
  it('accepts empty, valid and rejects out-of-range values', () => {
    expect(parseOptionalNumber('', 120, 220)).toBeNull()
    expect(parseOptionalNumber(' 152,5 ', 120, 220)).toBe(152.5)
    expect(parseOptionalNumber('20', 120, 220)).toBe('invalid')
    expect(parseOptionalNumber('abc', 120, 220)).toBe('invalid')
  })
})

describe('parseProfile', () => {
  const base = { birthYear: 2011, birthMonth: 3, sex: 'female', activity: 'high', goal: 'energy', diet: 'no_beef', avoid: ['egg'], mealsPerDay: 4, eatPlaces: ['hostel'], fasting: false }

  it('reads a stored profile', () => {
    const p = parseProfile(base, TODAY)
    expect(p?.goal).toBe('energy')
    expect(p?.avoid).toEqual(['egg'])
    expect(p?.heightCm).toBeNull()
  })
  it('rejects under-13s and broken data', () => {
    expect(parseProfile({ ...base, birthYear: 2015 }, TODAY)).toBeNull()
    expect(parseProfile({ ...base, birthMonth: 13 }, TODAY)).toBeNull()
    expect(parseProfile('nope', TODAY)).toBeNull()
  })
  it('replaces an old "lose" goal with a safe default', () => {
    expect(parseProfile({ ...base, goal: 'lose' }, TODAY)?.goal).toBe('balanced')
  })
  it('drops unknown avoid items and out-of-range body numbers', () => {
    const p = parseProfile({ ...base, avoid: ['egg', 'rocks'], weightKg: 900 }, TODAY)
    expect(p?.avoid).toEqual(['egg'])
    expect(p?.weightKg).toBeNull()
  })
})

describe('summary sent to the server', () => {
  it('contains no birth date, body numbers or avoid list', () => {
    const p = parseProfile({ birthYear: 2011, birthMonth: 3, weightKg: 50, heightCm: 150, avoid: ['egg'] }, TODAY)!
    expect(Object.keys(summarize(p, TODAY)).sort()).toEqual(['activity', 'age', 'diet', 'goal', 'sex'])
  })
})
