// Profile model and rules. Pure functions only (unit-tested); stored locally in IndexedDB.
//
// Teen safety (REBUILD_PLAN §3, prompt §3): under 18 => teen mode is forced on; no weight-loss goal
// exists for anyone; weight is optional and never shown as a number in teen mode.

export const MIN_AGE = 13
export const TEEN_MAX_AGE = 17
export const MAX_AGE = 80

export type Sex = 'female' | 'male' | 'unspecified'
export type Activity = 'low' | 'medium' | 'high'
/** Deliberately no "lose weight" goal. */
export type Goal = 'balanced' | 'energy' | 'muscle' | 'maintain'
export type Diet = 'any' | 'vegetarian' | 'no_beef'
export type Avoid = 'egg' | 'milk' | 'peanut' | 'nuts' | 'fish' | 'shrimp' | 'wheat' | 'soy'
export type EatPlace = 'home' | 'hostel' | 'canteen'

export const SEXES: Sex[] = ['female', 'male', 'unspecified']
export const ACTIVITIES: Activity[] = ['low', 'medium', 'high']
export const GOALS: Goal[] = ['balanced', 'energy', 'muscle', 'maintain']
export const DIETS: Diet[] = ['any', 'vegetarian', 'no_beef']
export const AVOIDS: Avoid[] = ['egg', 'milk', 'peanut', 'nuts', 'fish', 'shrimp', 'wheat', 'soy']
export const EAT_PLACES: EatPlace[] = ['home', 'hostel', 'canteen']
export const MEALS_PER_DAY = [2, 3, 4, 5, 6] as const

export const LIMITS = {
  heightCm: { min: 120, max: 220 },
  weightKg: { min: 25, max: 200 },
  budgetBdt: { min: 0, max: 100_000 },
} as const

export interface Profile {
  birthYear: number
  /** 1-12 */
  birthMonth: number
  sex: Sex
  heightCm: number | null
  weightKg: number | null
  activity: Activity
  goal: Goal
  diet: Diet
  avoid: Avoid[]
  mealsPerDay: number
  eatPlaces: EatPlace[]
  fasting: boolean
  budgetBdt: number | null
}

export const EMPTY_PROFILE: Omit<Profile, 'birthYear' | 'birthMonth'> = {
  sex: 'unspecified',
  heightCm: null,
  weightKg: null,
  activity: 'medium',
  goal: 'balanced',
  diet: 'any',
  avoid: [],
  mealsPerDay: 3,
  eatPlaces: ['home'],
  fasting: false,
  budgetBdt: null,
}

/** Whole years on `today`, counting the birth month (day unknown: assume the 1st). */
export function ageOn(birthYear: number, birthMonth: number, today: Date = new Date()): number {
  const months = (today.getFullYear() - birthYear) * 12 + (today.getMonth() + 1 - birthMonth)
  return Math.floor(months / 12)
}

export function isTeen(age: number): boolean {
  return age <= TEEN_MAX_AGE
}

/** Teen mode is forced on under 18; adults may choose it. */
export function teenModeOn(age: number, adultChoice: boolean): boolean {
  return isTeen(age) || adultChoice
}

/** Birth years that give an age between MIN_AGE and MAX_AGE today (newest first). */
export function birthYearOptions(today: Date = new Date()): number[] {
  const newest = today.getFullYear() - MIN_AGE
  return Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => newest - i)
}

/** Parse an optional number field: empty => null, outside limits => 'invalid'. */
export function parseOptionalNumber(text: string, min: number, max: number): number | null | 'invalid' {
  const t = text.trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < min || n > max) return 'invalid'
  return Math.round(n * 10) / 10
}

const isOneOf = <T extends string>(v: unknown, options: readonly T[]): v is T => typeof v === 'string' && options.includes(v as T)

/** Validate data read back from storage (it may come from an older app version). */
export function parseProfile(raw: unknown, today: Date = new Date()): Profile | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const year = Number(r.birthYear)
  const month = Number(r.birthMonth)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null
  const age = ageOn(year, month, today)
  if (age < MIN_AGE || age > MAX_AGE) return null
  const num = (v: unknown, lim: { min: number; max: number }) =>
    typeof v === 'number' && v >= lim.min && v <= lim.max ? v : null
  const goal = isOneOf(r.goal, GOALS) ? r.goal : EMPTY_PROFILE.goal
  return {
    birthYear: year,
    birthMonth: month,
    sex: isOneOf(r.sex, SEXES) ? r.sex : EMPTY_PROFILE.sex,
    heightCm: num(r.heightCm, LIMITS.heightCm),
    weightKg: num(r.weightKg, LIMITS.weightKg),
    activity: isOneOf(r.activity, ACTIVITIES) ? r.activity : EMPTY_PROFILE.activity,
    goal,
    diet: isOneOf(r.diet, DIETS) ? r.diet : EMPTY_PROFILE.diet,
    avoid: Array.isArray(r.avoid) ? r.avoid.filter((a): a is Avoid => isOneOf(a, AVOIDS)) : [],
    mealsPerDay: MEALS_PER_DAY.includes(Number(r.mealsPerDay) as 2) ? Number(r.mealsPerDay) : EMPTY_PROFILE.mealsPerDay,
    eatPlaces: Array.isArray(r.eatPlaces) ? r.eatPlaces.filter((p): p is EatPlace => isOneOf(p, EAT_PLACES)) : EMPTY_PROFILE.eatPlaces,
    fasting: r.fasting === true,
    budgetBdt: num(r.budgetBdt, LIMITS.budgetBdt),
  }
}

/** Only what the server needs to pick reference values: no birth date, body numbers or avoid list. */
export interface ProfileSummary {
  age: number
  sex: Sex
  activity: Activity
  goal: Goal
  diet: Diet
}

export function summarize(p: Profile, today: Date = new Date()): ProfileSummary {
  return { age: ageOn(p.birthYear, p.birthMonth, today), sex: p.sex, activity: p.activity, goal: p.goal, diet: p.diet }
}
