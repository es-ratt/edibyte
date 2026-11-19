import { useEffect, useRef, useState } from 'react'
import { BadgeCheck, CircleAlert, ExternalLink, HeartHandshake, Mic, Send, ShieldAlert, X } from 'lucide-react'
import { useAppStore, useMode, useT } from '@/app/store'
import { Chip, PageTitle } from '@/components/ui'
import { useDraft } from '@/features/capture/draft'
import { ageOn } from '@/features/profile/model'
import { foodName } from '@/features/report/food'
import { api } from '@/lib/api'
import { MEDICAL_GUARDRAILS, type ChatTurn, type CoachAnswer, type CoachContext } from '@/lib/coach/types'
import { queueEvent } from '@/lib/db'
import type { Lang, TKey } from '@/lib/i18n'

const SUGGESTIONS_WITH_MEAL: TKey[] = ['coach.s1', 'coach.s2', 'coach.s3', 'coach.s4']
const SUGGESTIONS: TKey[] = ['coach.s5', 'coach.s3', 'coach.s4']
const SPEECH_LANG: Record<Lang, string> = { bn: 'bn-BD', en: 'en-US', banglish: 'bn-BD' }

type Message = { role: 'user'; text: string } | { role: 'assistant'; reply: CoachAnswer }

// Minimal typing for the Web Speech API (not in TypeScript's DOM lib).
type Recognition = { lang: string; interimResults: boolean; start: () => void; onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null; onend: (() => void) | null }
type RecognitionCtor = new () => Recognition

function speechRecognition(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function Reply({ reply }: { reply: CoachAnswer }) {
  const t = useT()
  const medical = reply.guardrail !== null && MEDICAL_GUARDRAILS.has(reply.guardrail)
  const safe = reply.guardrail !== null
  const box = medical ? 'border border-terracotta bg-terracotta-50' : safe ? 'bg-olive-50' : 'bg-surface shadow-card'
  return (
    <div className={`max-w-[92%] rounded-card p-4 ${box}`}>
      {safe && (
        <p className={`mb-2 flex items-center gap-2 text-sm font-semibold ${medical ? 'text-terracotta' : 'text-olive-900'}`}>
          {medical ? <ShieldAlert size={18} aria-hidden /> : <HeartHandshake size={18} aria-hidden />}
          {t('coach.safe')}
        </p>
      )}
      {/* Plain text only (never HTML): answers can contain user-influenced text. */}
      <p className="whitespace-pre-line text-ink">{reply.answer}</p>
      {!reply.checked && <p className="mt-2 text-sm text-muted">{t('coach.checkedNote')}</p>}
      {reply.sources.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t('coach.sources')}</p>
          <ul className="flex flex-wrap gap-2">
            {reply.sources.slice(0, 5).map((s) => (
              <li key={`${s.type}-${s.id}`} className="inline-flex items-center gap-1">
                <Chip icon={s.verified ? BadgeCheck : CircleAlert} tone={s.verified ? 'olive' : 'amber'}>
                  {s.title}
                </Chip>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`${t('coach.sources')}: ${s.title}`} className="grid size-10 place-items-center rounded-full text-olive-700">
                    <ExternalLink size={14} aria-hidden />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function Coach() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const profile = useAppStore((s) => s.profile)
  const mode = useMode()
  const result = useDraft((s) => s.result)
  const [useMeal, setUseMeal] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const Speech = speechRecognition()

  useEffect(() => {
    // Optional call: very old WebViews (and jsdom) have no scrollIntoView.
    end.current?.scrollIntoView?.({ block: 'end' })
  }, [messages, busy])

  const mealFoods = useMeal && result ? result.items.map((i) => i.food) : []
  const context: CoachContext = {
    age: mode.age,
    goal: profile?.goal ?? null,
    diet: profile?.diet ?? null,
    meal_food_ids: mealFoods.map((f) => f.id),
    verdict_codes: useMeal && result ? result.verdict.reasons.map((r) => r.code) : [],
  }

  const ask = async (question: string) => {
    const q = question.trim()
    if (!q || busy) return
    const history: ChatTurn[] = messages.slice(-6).map((m) => (m.role === 'user' ? { role: 'user', content: m.text } : { role: 'assistant', content: m.reply.answer }))
    setMessages((m) => [...m, { role: 'user', text: q }])
    setText('')
    setBusy(true)
    void queueEvent('coach_asked')
    try {
      const reply = await api.coach({ question: q, lang, history, context: profile ? { ...context, age: ageOn(profile.birthYear, profile.birthMonth) } : context })
      setMessages((m) => [...m, { role: 'assistant', reply }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', reply: { answer: t('common.error'), sources: [], lang, mode: 'offline', guardrail: null, checked: true } }])
    } finally {
      setBusy(false)
    }
  }

  const handleMic = () => {
    if (!Speech) return
    const rec = new Speech()
    rec.lang = SPEECH_LANG[lang]
    rec.interimResults = false
    rec.onresult = (e) => setText(e.results[0][0].transcript)
    rec.onend = () => setListening(false)
    setListening(true)
    rec.start()
  }

  const suggestions = mealFoods.length ? SUGGESTIONS_WITH_MEAL : SUGGESTIONS

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>{t('route.coach')}</PageTitle>
      <p className="-mt-2 text-muted">{t('coach.intro')}</p>

      {mealFoods.length > 0 && (
        <div className="flex items-center gap-2 rounded-2xl bg-olive-50 p-2 ps-3">
          <span className="flex-1 text-sm font-medium text-olive-900">{t('coach.mealChip', { foods: mealFoods.map((f) => foodName(f, lang)).join(', ') })}</span>
          <button type="button" onClick={() => setUseMeal(false)} aria-label={t('coach.clearMeal')} className="grid size-10 place-items-center rounded-full text-olive-900 hover:bg-olive-100">
            <X size={18} aria-hidden />
          </button>
        </div>
      )}

      {messages.length === 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t('coach.intro')}>
          {suggestions.map((k) => (
            <li key={k}>
              <button type="button" onClick={() => void ask(t(k))} className="min-h-tap rounded-full border border-olive-200 bg-surface px-4 text-start text-sm font-medium text-olive-900 hover:bg-olive-50">
                {t(k)}
              </button>
            </li>
          ))}
        </ul>
      )}

      <section aria-live="polite" className="flex flex-col gap-3">
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="ms-auto max-w-[85%] rounded-card bg-olive-700 px-4 py-3 text-white">
              <span className="sr-only">{t('coach.you')}: </span>
              {m.text}
            </div>
          ) : (
            <div key={i}>
              <span className="sr-only">{t('coach.bot')}: </span>
              <Reply reply={m.reply} />
            </div>
          ),
        )}
        {busy && (
          <p role="status" className="text-muted">
            {t('coach.thinking')}
          </p>
        )}
        <div ref={end} />
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void ask(text)
        }}
        className="sticky bottom-20 -mx-4 flex items-end gap-2 bg-cream/95 px-4 py-2 backdrop-blur"
      >
        <label htmlFor="coach-q" className="sr-only">
          {t('coach.placeholder')}
        </label>
        <textarea
          id="coach-q"
          rows={1}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={listening ? t('coach.listening') : t('coach.placeholder')}
          className="min-h-tap flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-3 focus-visible:outline-3 focus-visible:outline-olive-700"
        />
        {Speech && (
          <button type="button" onClick={handleMic} aria-label={t('coach.mic')} aria-pressed={listening} className="grid size-12 shrink-0 place-items-center rounded-2xl border border-olive-200 bg-surface text-olive-900">
            <Mic size={20} aria-hidden />
          </button>
        )}
        <button type="submit" disabled={!text.trim() || busy} aria-label={t('coach.ask')} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-olive-700 text-white disabled:opacity-50">
          <Send size={20} aria-hidden />
        </button>
      </form>
      <p className="text-center text-xs text-muted">{t('coach.disclaimer')}</p>
    </div>
  )
}
