import { describe, expect, it } from 'vitest'
import { DICTS, fmtNum, LANGS, translate } from './index'

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('i18n completeness', () => {
  const keys = Object.keys(DICTS.bn).sort()

  it.each(LANGS)('%s has exactly the same keys as bn', (lang) => {
    expect(Object.keys(DICTS[lang]).sort()).toEqual(keys)
  })

  it.each(LANGS)('%s has no empty strings', (lang) => {
    const empty = keys.filter((k) => !DICTS[lang][k as keyof (typeof DICTS)['bn']]?.trim())
    expect(empty).toEqual([])
  })

  it.each(LANGS)('%s uses the same {placeholders} as bn', (lang) => {
    const wrong = keys.filter((k) => {
      const key = k as keyof (typeof DICTS)['bn']
      return placeholders(DICTS[lang][key]).join() !== placeholders(DICTS.bn[key]).join()
    })
    expect(wrong).toEqual([])
  })
})

describe('translate / fmtNum', () => {
  it('fills placeholders', () => {
    expect(translate('en', 'data.rows', { n: 5 })).toBe('5 rows')
  })
  it('uses Bangla digits only for Bangla', () => {
    expect(fmtNum(1234, 'bn')).toBe('১,২৩৪')
    expect(fmtNum(1234, 'banglish')).toBe('1,234')
  })
})
