// Bundle budget for the PWA on mobile data: total gzipped JS in dist/assets.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const BUDGET_KB = 200
const dir = fileURLToPath(new URL('../dist/assets/', import.meta.url))
const files = readdirSync(dir).filter((f) => f.endsWith('.js'))
const total = files.reduce((sum, f) => sum + gzipSync(readFileSync(join(dir, f))).length, 0)
const kb = total / 1024
process.stdout.write(`JS gzip total: ${kb.toFixed(1)} KB across ${files.length} files (budget ${BUDGET_KB} KB)\n`)
if (kb > BUDGET_KB) {
  process.stderr.write('Over the bundle budget\n')
  process.exit(1)
}
