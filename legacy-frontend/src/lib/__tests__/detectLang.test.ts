import { describe, expect, it } from 'vitest'
import { detectLang } from '../detectLang'

describe('detectLang', () => {
  it('detects Bangla script', () => {
    expect(detectLang('একটা ডিমে কত প্রোটিন?')).toBe('bn')
    expect(detectLang('ভাত, dal ar মাছের ঝোল')).toBe('bn')
  })

  it('detects Banglish (Bangla in Latin letters)', () => {
    expect(detectLang('ekta dim e koto protein?')).toBe('banglish')
    expect(detectLang('bhat er bodole ki khete pari')).toBe('banglish')
    expect(detectLang('kom khoroche protein kothay pabo')).toBe('banglish')
  })

  it('detects English', () => {
    expect(detectLang('How much protein is in an egg?')).toBe('en')
    expect(detectLang('Is singara a good evening snack?')).toBe('en')
    expect(detectLang('hi')).toBe('en')
  })
})
