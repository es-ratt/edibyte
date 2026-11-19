// Guess which language the user typed: Bangla script, Banglish (Bangla in Latin letters) or English.
// The backend does the same check; this copy lets the mock/offline UI answer in the right language too.

import type { ApiLang } from '@/types/api'

const BANGLA = /[\u0980-\u09FF]/
const STRONG = new Set(
  ('ami amar amake apni apnar tumi tomar ki kono kon koto kothay kothai keno kemon kivabe kibhabe kobe kokhon kar kake ' +
    'khailam khaisi khacchi kheyechi kheyechen khelam khabo khete khai khaite khaoya khawa khabar bhalo valo bhal kharap ' +
    'komano komate beshi barano barate ektu ekta duita dui tinta gulo guli diye dile shathe sathe hobe hoy hoye hocche ' +
    'kore korbo korte korle korchi pabo pari parbo parben paren pawa bodole jonno niye theke dorkar lage laglo ache nei nai ' +
    'na ebong othoba kintu tahole bolo bolen bolun bolte jiggesh shorir ojon bikel dupur sokal nasta shobar shob ' +
    'eta ota ekhon ekhane ekdom onek kichu kisu').split(' '),
)
const WEAK = new Set('bhat dim dal mach mangsho murgi shobji shak ruti doi dudh chini lobon tel alu begun'.split(' '))

export function detectLang(text: string): ApiLang {
  if (BANGLA.test(text)) return 'bn'
  const words = text.toLowerCase().match(/[a-z]+/g) ?? []
  if (words.some((w) => STRONG.has(w))) return 'banglish'
  return new Set(words.filter((w) => WEAK.has(w))).size >= 2 ? 'banglish' : 'en'
}
