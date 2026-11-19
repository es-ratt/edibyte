import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Image, Lock, PauseCircle, Search } from 'lucide-react'
import { useAppStore, useMode, useT } from '@/app/store'
import { Field, inputClass } from '@/components/form'
import { Button, Card, PageTitle } from '@/components/ui'
import { rowsFromParse, unmatchedFromParse, useDraft } from '@/features/capture/draft'
import { api, ApiError, type ParseResult } from '@/lib/api'
import { queueEvent } from '@/lib/db'
import { LOW_DATA_MAX_SIDE_PX, MAX_SIDE_PX, prepareMealPhoto } from '@/lib/image'
import type { TKey } from '@/lib/i18n'

type Phase = { kind: 'idle' } | { kind: 'analyzing' } | { kind: 'error'; message: TKey }

export default function Capture() {
  const t = useT()
  const navigate = useNavigate()
  const mode = useMode()
  const lang = useAppStore((s) => s.lang)
  const lowData = useAppStore((s) => s.lowData)
  const start = useDraft((s) => s.start)
  const markStarted = useDraft((s) => s.markStarted)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [text, setText] = useState('')
  const abort = useRef<AbortController | null>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)

  const goConfirm = (result: ParseResult, fromPhoto: boolean) => {
    if (!result.items.length && !result.unmatched.length) {
      setPhase({ kind: 'error', message: 'cap.noFood' })
      return
    }
    start(rowsFromParse(result, fromPhoto ? 'photo' : 'text'), fromPhoto, unmatchedFromParse(result))
    navigate('/confirm')
  }

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return
    const ctrl = new AbortController()
    abort.current = ctrl
    markStarted()
    void queueEvent('photo_used')
    setPhase({ kind: 'analyzing' })
    try {
      const photo = await prepareMealPhoto(file, lowData ? LOW_DATA_MAX_SIDE_PX : MAX_SIDE_PX)
      const result = await api.parseImage(photo, lang, ctrl.signal)
      goConfirm(result, true)
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === -1) return setPhase({ kind: 'idle' })
      const off = error instanceof ApiError && (error.status === 404 || error.status === 503)
      setPhase({ kind: 'error', message: off ? 'cap.photoOff' : 'cap.photoFailed' })
    } finally {
      abort.current = null
      // Let the same file be chosen again; the browser keeps no reference after this.
      if (cameraInput.current) cameraInput.current.value = ''
      if (galleryInput.current) galleryInput.current.value = ''
    }
  }

  const handleText = async () => {
    if (!text.trim()) return
    markStarted()
    setPhase({ kind: 'analyzing' })
    try {
      goConfirm(await api.parseMeal(text.trim(), lang), false)
    } catch {
      setPhase({ kind: 'error', message: 'common.error' })
    }
  }

  if (mode.trackingHidden) {
    return (
      <>
        <PageTitle>{t('route.capture')}</PageTitle>
        <Card className="flex items-start gap-3">
          <PauseCircle size={22} aria-hidden className="mt-0.5 shrink-0 text-olive-700" />
          <p>{t('home.paused')}</p>
        </Card>
      </>
    )
  }

  if (phase.kind === 'analyzing') {
    return (
      <div className="flex flex-col gap-4 pt-4" role="status" aria-live="polite">
        <PageTitle>{t('cap.analyzing')}</PageTitle>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex animate-pulse items-center gap-3 rounded-card bg-surface p-5 shadow-card">
            <div className="size-11 rounded-2xl bg-olive-100" />
            <div className="h-4 flex-1 rounded bg-olive-100" />
          </div>
        ))}
        {abort.current && (
          <Button variant="secondary" onClick={() => abort.current?.abort()}>
            {t('cap.cancel')}
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <PageTitle>{t('route.capture')}</PageTitle>
      {phase.kind === 'error' && (
        <p role="alert" className="mb-4 rounded-2xl bg-mustard-100 p-4 font-medium text-ink">
          {t(phase.message)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-card bg-olive-700 p-4 text-center font-semibold text-white shadow-card has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-olive-900">
          <Camera size={32} aria-hidden />
          {t('cap.takePhoto')}
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => void handlePhoto(e.target.files?.[0])} />
        </label>
        <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-olive-200 bg-surface p-4 text-center font-semibold text-olive-900 shadow-card has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-olive-700">
          <Image size={32} aria-hidden />
          {t('cap.gallery')}
          <input ref={galleryInput} type="file" accept="image/*" className="sr-only" onChange={(e) => void handlePhoto(e.target.files?.[0])} />
        </label>
      </div>

      <Card className="mt-4" as="section" labelledBy="guide-title">
        <h2 id="guide-title" className="mb-2 font-semibold text-olive-900">
          {t('cap.guideTitle')}
        </h2>
        <div className="flex items-center gap-4">
          {/* Plate guide: a plate seen from above inside the camera frame. */}
          <svg viewBox="0 0 64 64" className="size-16 shrink-0" aria-hidden>
            <rect x="4" y="4" width="56" height="56" rx="10" fill="none" stroke="var(--color-olive-700)" strokeWidth="2.5" strokeDasharray="6 4" />
            <circle cx="32" cy="32" r="18" fill="var(--color-olive-50)" stroke="var(--color-olive-700)" strokeWidth="2.5" />
            <circle cx="32" cy="32" r="10" fill="none" stroke="var(--color-olive-500)" strokeWidth="2" />
          </svg>
          <ul className="list-disc ps-5 text-ink">
            <li>{t('cap.guide1')}</li>
            <li>{t('cap.guide2')}</li>
            <li>{t('cap.guide3')}</li>
          </ul>
        </div>
        <p className="mt-3 flex gap-2 text-sm text-muted">
          <Lock size={16} aria-hidden className="mt-0.5 shrink-0" />
          {t('cap.notSaved')}
        </p>
      </Card>

      <Card className="mt-4" as="section" labelledBy="type-title">
        <h2 id="type-title" className="mb-3 font-semibold text-olive-900">
          {t('cap.or')}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleText()
          }}
          className="flex flex-col gap-3"
        >
          <Field id="meal-text" label={t('cap.typeLabel')} hint={t('cap.typeHint')}>
            <input id="meal-text" className={inputClass} value={text} onChange={(e) => setText(e.target.value)} aria-describedby="meal-text-msg" maxLength={500} />
          </Field>
          <Button type="submit" variant="secondary" disabled={!text.trim()}>
            <Search size={18} aria-hidden />
            {t('cap.typeGo')}
          </Button>
        </form>
      </Card>
    </>
  )
}
