import { RotateCcw, Send } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/Button'
import { ChatBubble, TypingIndicator } from '@/components/ChatBubble'
import { Chip } from '@/components/Chip'
import { PageHeader } from '@/components/PageHeader'
import { errorKey, useApp, type ChatMessage } from '@/hooks/useApp'
import { detectLang } from '@/lib/detectLang'
import type { TKey } from '@/lib/i18n'
import { api } from '@/services/api'

const SUGGESTED: TKey[] = ['coach.q1', 'coach.q2', 'coach.q3', 'coach.q4']
const newId = () => Math.random().toString(36).slice(2)

export default function Coach() {
  const { t, profile, chat, setChat, chatHistory } = useApp()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputId = useId()

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [chat.length, busy])

  const ask = async (question: string) => {
    const q = question.trim()
    if (!q || busy) return
    const history = chatHistory()
    setChat((c) => [...c, { id: newId(), role: 'user', content: q }])
    setInput('')
    setBusy(true)
    try {
      // The answer follows the language the user typed (Bangla, English or Banglish), not the UI language.
      const r = await api.coach(q, detectLang(q), profile, history)
      const msg: ChatMessage = { id: newId(), role: 'assistant', content: r.answer, sources: r.sources, mode: r.mode, guardrail: r.guardrail }
      setChat((c) => [...c, msg])
    } catch (e) {
      setChat((c) => [...c, { id: newId(), role: 'assistant', content: t(errorKey(e)), error: true }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageHeader title={t('coach.title')} subtitle={t('coach.subtitle')}>
        {chat.length > 0 && (
          <Button variant="ghost" icon={<RotateCcw size={18} aria-hidden />} onClick={() => setChat([])}>
            {t('coach.clear')}
          </Button>
        )}
      </PageHeader>

      <section aria-live="polite" aria-relevant="additions" className="min-h-[40vh] space-y-4 rounded-2xl border border-olive-100 bg-olive-50 p-4 sm:p-6">
        <ChatBubble role="assistant">{t('coach.welcome')}</ChatBubble>
        {chat.map((m) => (
          <ChatBubble key={m.id} role={m.role} sources={m.sources} offline={m.mode === 'offline'} guardrail={!!m.guardrail} error={m.error}>
            {m.content}
          </ChatBubble>
        ))}
        {busy && <TypingIndicator />}
        {chat.length === 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-muted">{t('coach.suggested')}</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((k) => (
                <Chip key={k} onClick={() => ask(t(k))}>
                  {t(k)}
                </Chip>
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </section>

      <form
        className="sticky bottom-20 mt-4 flex items-end gap-2 rounded-2xl border border-olive-100 bg-white p-2 shadow-soft lg:bottom-4"
        onSubmit={(e) => {
          e.preventDefault()
          ask(input)
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          {t('coach.inputLabel')}
        </label>
        <textarea
          id={inputId}
          rows={1}
          maxLength={1000}
          value={input}
          placeholder={t('coach.placeholder')}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              ask(input)
            }
          }}
          className="max-h-40 min-h-11 flex-1 resize-none rounded-xl bg-transparent px-3 py-2.5 outline-none placeholder:text-muted"
        />
        <Button type="submit" disabled={busy || !input.trim()} aria-label={t('coach.send')} icon={<Send size={18} aria-hidden />}>
          <span className="hidden sm:inline">{t('coach.send')}</span>
        </Button>
      </form>
      <p className="mt-2 text-center text-sm text-muted">{t('coach.disclaimer')}</p>
    </div>
  )
}
