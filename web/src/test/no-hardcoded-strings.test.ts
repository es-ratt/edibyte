// Fails when a .tsx file contains visible text that does not come from the i18n dictionaries.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..')
const ALLOWED_TEXT = new Set(['EdiByte'])

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return name === 'test' ? [] : tsxFiles(p)
    return p.endsWith('.tsx') && !p.endsWith('.test.tsx') ? [p] : []
  })
}

describe('no hard-coded UI strings', () => {
  it('JSX text and text attributes come from t()', () => {
    const problems: string[] = []
    for (const file of tsxFiles(SRC)) {
      // Remove arrows and comparison operators so they are not read as tag boundaries.
      const src = readFileSync(file, 'utf8').replace(/=>|>=|<=| > | < /g, '  ')
      // Text between tags: >Some words<
      for (const m of src.matchAll(/>\s*([^<>{}\s][^<>{}]*?)\s*</g)) {
        const text = m[1].trim()
        const looksLikeCode = /^[=&|?:.)(]/.test(text) || /(if|return|const|let)|&&|\|\|/.test(text)
        if (/[A-Za-zঀ-৿]{2,}/.test(text) && !ALLOWED_TEXT.has(text) && !looksLikeCode) {
          problems.push(`${relative(SRC, file)}: "${text}"`)
        }
      }
      // Literal accessible names / placeholders
      for (const m of src.matchAll(/\b(aria-label|title|placeholder|alt)="([^"]*[A-Za-zঀ-৿][^"]*)"/g)) {
        problems.push(`${relative(SRC, file)}: ${m[1]}="${m[2]}"`)
      }
    }
    expect(problems).toEqual([])
  })
})
