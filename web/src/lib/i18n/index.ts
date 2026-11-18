import { banglish } from './banglish'
import { bn, type TKey } from './bn'
import { en } from './en'

export type Lang = 'bn' | 'en' | 'banglish'
export type { TKey }

export const LANGS: Lang[] = ['bn', 'en', 'banglish']
export const DICTS: Record<Lang, Record<TKey, string>> = { bn, en, banglish }

/** HTML lang attribute: Banglish is Bangla written in Latin letters. */
export const htmlLang = (lang: Lang) => (lang === 'en' ? 'en' : lang === 'bn' ? 'bn' : 'bn-Latn')

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let s: string = DICTS[lang][key] ?? DICTS.bn[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯'
/** Numbers in Bangla digits for Bangla, Latin digits otherwise. */
export function fmtNum(n: number, lang: Lang, maxFrac = 0): string {
  const s = n.toLocaleString('en-US', { maximumFractionDigits: maxFrac })
  return lang === 'bn' ? s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : s
}
