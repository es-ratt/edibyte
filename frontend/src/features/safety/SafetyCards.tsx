import { useState } from 'react'
import { HeartHandshake, ClipboardList } from 'lucide-react'
import { useAppStore, useT } from '@/app/store'
import { Button, Card } from '@/components/ui'
import { SUPPORT_CONFIG } from './support.config'
import { allAnswered, checkInAvailable, isFlagged } from './wellbeing'
import { WELLBEING_CONFIG } from './wellbeing.config'

export function SupportCard() {
  const lang = useAppStore((s) => s.lang)
  return (
    <Card as="section" labelledBy="support-title" tone="tint">
      <h2 id="support-title" className="mb-2 flex items-center gap-2 font-semibold text-olive-900">
        <HeartHandshake size={20} aria-hidden />
        {SUPPORT_CONFIG.title[lang]}
      </h2>
      <p className="text-ink">{SUPPORT_CONFIG.message[lang]}</p>
      {SUPPORT_CONFIG.contacts.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {SUPPORT_CONFIG.contacts.map((c) => (
            <li key={c.contact}>
              <span className="font-semibold">{c.name[lang]}</span>: {c.contact}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/** Placeholder check-in: renders the reviewed questions from wellbeing.config.ts, or "not set up yet". */
export function WellbeingCheckIn() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const setSafety = useAppStore((s) => s.setSafety)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const available = checkInAvailable(WELLBEING_CONFIG)

  const handleSubmit = () => {
    // Answers are not stored or sent anywhere; only the flag is kept on this device.
    if (isFlagged(WELLBEING_CONFIG, answers)) setSafety({ wellbeingFlagged: true })
    setDone(true)
  }

  return (
    <Card as="section" labelledBy="wb-title">
      <h2 id="wb-title" className="mb-2 flex items-center gap-2 font-semibold text-olive-900">
        <ClipboardList size={20} aria-hidden />
        {t('wb.title')}
      </h2>
      {!available && <p className="text-muted">{t('wb.notSetUp')}</p>}
      {available && done && <p role="status">{t('wb.thanks')}</p>}
      {available && !done && (
        <div className="flex flex-col gap-4">
          {WELLBEING_CONFIG.questions.map((q) => (
            <fieldset key={q.id}>
              <legend className="mb-2 font-medium">{q.text[lang]}</legend>
              {q.options.map((o) => (
                <label key={o.id} className="flex min-h-tap items-center gap-3">
                  <input type="radio" name={q.id} checked={answers[q.id] === o.id} onChange={() => setAnswers({ ...answers, [q.id]: o.id })} className="size-5 accent-olive-700" />
                  {o.text[lang]}
                </label>
              ))}
            </fieldset>
          ))}
          <Button disabled={!allAnswered(WELLBEING_CONFIG, answers)} onClick={handleSubmit}>
            {t('wb.submit')}
          </Button>
        </div>
      )}
    </Card>
  )
}
