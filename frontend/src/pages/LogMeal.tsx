import { AlertTriangle, Camera, Info, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { FoodPicker } from '@/components/FoodPicker'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonCard } from '@/components/Skeleton'
import { errorKey, useApp, type ReviewRow } from '@/hooks/useApp'
import { foodName, previewGrams, servingDesc, unitKey, UNITS } from '@/lib/food'
import { fmtNum, type TKey } from '@/lib/i18n'
import { api } from '@/services/api'
import type { MealType, ParseResponse } from '@/types/api'

const EXAMPLES: { key: TKey; text: string }[] = [
  { key: 'log.exBn', text: 'এক প্লেট ভাত, এক বাটি ডাল আর একটা ডিম' },
  { key: 'log.exBl', text: '2ta ruti, dim bhaji ar ek cup cha' },
  { key: 'log.exEn', text: 'A plate of rice with chicken curry and salad' },
  { key: 'log.exMixed', text: 'ভাত, dal ar মাছের ঝোল' },
]
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const MAX = 500

let rowCounter = 0
const newKey = () => `r${Date.now().toString(36)}-${++rowCounter}`

function rowsFromParse(res: ParseResponse): ReviewRow[] {
  return [
    ...res.items.map((i) => ({
      key: newKey(), rawName: i.raw_name, food: i.food, quantity: i.quantity, unit: i.unit, confidence: i.confidence, suggestions: [],
    })),
    ...res.unmatched.map((u) => ({
      key: newKey(), rawName: u.raw_name, food: null, quantity: u.quantity, unit: u.unit, confidence: 0, suggestions: u.suggestions,
    })),
  ]
}

function Steps({ step }: { step: 0 | 1 }) {
  const { t, lang } = useApp()
  const labels: TKey[] = ['log.stepWrite', 'log.stepReview', 'log.stepReport']
  return (
    <ol className="mb-6 flex items-center gap-2 text-sm" aria-label={t('log.steps')}>
      {labels.map((k, i) => (
        <li key={k} className="flex items-center gap-2" aria-current={i === step ? 'step' : undefined}>
          <span className={`grid size-7 place-items-center rounded-full font-bold ${i <= step ? 'bg-olive-700 text-white' : 'bg-olive-100 text-muted'}`}>
            {fmtNum(i + 1, lang)}
          </span>
          <span className={i === step ? 'font-semibold text-olive-900' : 'text-muted'}>{t(k)}</span>
          {i < labels.length - 1 && <span className="mx-1 h-px w-6 bg-olive-200 sm:w-10" aria-hidden />}
        </li>
      ))}
    </ol>
  )
}

export default function LogMeal() {
  const { t, lang, apiLang, draft, setDraft, setReportItems, healthData } = useApp()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<TKey | null>(null)
  const textId = useId()
  const checkRef = useRef<HTMLButtonElement>(null)
  const isDemo = params.get('demo') === '1'

  useEffect(() => {
    if (isDemo && !draft.rows) checkRef.current?.focus({ preventScroll: true })
  }, [isDemo, draft.rows])

  const handleResult = (res: ParseResponse) => {
    setDraft((d) => ({ ...d, rows: rowsFromParse(res), parseMode: res.mode, warnings: res.warnings }))
    window.scrollTo(0, 0) // start the review step at the top
  }

  const check = async () => {
    if (!draft.text.trim()) return setError('log.empty')
    setError(null)
    setLoading(true)
    try {
      handleResult(await api.parseMeal(draft.text, apiLang))
    } catch (e) {
      setError(errorKey(e))
    } finally {
      setLoading(false)
    }
  }

  const onPhoto = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setLoading(true)
    try {
      handleResult(await api.parseImage(file, apiLang))
    } catch (e) {
      setError(errorKey(e))
    } finally {
      setLoading(false)
    }
  }

  // ---------- Step 2: review ----------
  if (draft.rows) {
    const rows = draft.rows
    const update = (key: string, patch: Partial<ReviewRow>) =>
      setDraft((d) => ({ ...d, rows: d.rows!.map((r) => (r.key === key ? { ...r, ...patch } : r)) }))
    const remove = (key: string) => setDraft((d) => ({ ...d, rows: d.rows!.filter((r) => r.key !== key) }))
    const add = () =>
      setDraft((d) => ({ ...d, rows: [...d.rows!, { key: newKey(), rawName: '', food: null, quantity: null, unit: null, confidence: 1, suggestions: [] }] }))
    const unresolved = rows.filter((r) => !r.food).length
    const matchedFromParse = rows.some((r) => r.food)

    const toReport = () => {
      setReportItems(
        rows.filter((r) => r.food).map((r) => ({ food_id: r.food!.id, quantity: r.quantity, unit: r.unit })),
        draft.mealType,
      )
      navigate('/report')
    }

    return (
      <div className="mx-auto max-w-3xl">
        <Steps step={1} />
        <PageHeader title={t('review.title')} />
        <div role="note" className="mb-4 flex items-start gap-3 rounded-2xl border border-mustard/50 bg-mustard-100 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-olive-900" aria-hidden />
          <div>
            <p className="font-semibold text-ink">{t('review.warning')}</p>
            {draft.text && <p className="mt-1 text-sm text-muted">{t('review.youWrote', { text: draft.text.slice(0, 120) })}</p>}
            {draft.warnings.includes('ai_unavailable_used_offline_parser') && <p className="mt-1 text-sm text-muted">{t('review.aiFallback')}</p>}
          </div>
        </div>

        {!matchedFromParse && rows.length > 0 && <p className="mb-4 text-muted">{t('review.nothingFound')}</p>}
        {rows.length === 0 && <p className="mb-4 text-muted">{draft.warnings.includes('no_food_found') ? t('review.nothingFound') : t('review.noItems')}</p>}

        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.key}>
              <ReviewRowCard row={row} onChange={(p) => update(row.key, p)} onRemove={() => remove(row.key)} />
            </li>
          ))}
        </ul>

        <div className="mt-4">
          <Button variant="ghost" icon={<Plus size={18} aria-hidden />} onClick={add}>
            {t('review.addItem')}
          </Button>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-olive-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" icon={<Pencil size={18} aria-hidden />} onClick={() => setDraft((d) => ({ ...d, rows: null }))}>
            {t('review.editText')}
          </Button>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {unresolved > 0 && (
              <p id="fix-first" className="text-sm font-semibold text-danger">
                {t('review.fixFirst')}
              </p>
            )}
            <Button onClick={toReport} disabled={unresolved > 0 || rows.length === 0} aria-describedby={unresolved ? 'fix-first' : undefined} className="text-lg">
              {t('review.seeReport')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- Step 1: write ----------
  return (
    <div className="mx-auto max-w-3xl">
      <Steps step={0} />
      <PageHeader title={t('log.title')} subtitle={t('log.subtitle')} />
      {isDemo && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-olive-100 px-4 py-3 text-olive-900">
          <Info size={18} aria-hidden className="shrink-0" /> {t('log.demoHint')}
        </p>
      )}
      <Card>
        <label htmlFor={textId} className="mb-2 block font-semibold text-olive-900">
          {t('log.inputLabel')}
        </label>
        <textarea
          id={textId}
          rows={4}
          maxLength={MAX}
          value={draft.text}
          placeholder={t('log.placeholder')}
          onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) check()
          }}
          aria-describedby={`${textId}-count`}
          className="w-full resize-y rounded-xl border-2 border-olive-200 bg-olive-50 p-4 text-lg placeholder:text-muted focus:border-olive-600 focus:bg-white focus:outline-none"
        />
        <p id={`${textId}-count`} className="mt-1 text-right text-xs text-muted">
          {fmtNum(draft.text.length, lang)}/{fmtNum(MAX, lang)}
        </p>

        <p className="mb-2 mt-2 text-sm font-semibold text-muted">{t('log.examples')}</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <Chip key={ex.key} onClick={() => setDraft((d) => ({ ...d, text: ex.text }))}>
              <span className="text-xs font-bold text-olive-600">{t(ex.key)}</span>
              <span lang={/[ঀ-৿]/.test(ex.text) ? 'bn' : 'en'}>{ex.text}</span>
            </Chip>
          ))}
        </div>

        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-semibold text-muted">{t('log.mealType')}</legend>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map((m) => (
              <Chip key={m} selected={draft.mealType === m} onClick={() => setDraft((d) => ({ ...d, mealType: d.mealType === m ? null : m }))}>
                {t(`meal.${m}` as TKey)}
              </Chip>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-danger-50 px-4 py-3 font-semibold text-danger">
            {t(error)}
          </p>
        )}

        <Button ref={checkRef} className={`mt-6 w-full text-lg sm:w-auto ${isDemo ? 'ring-4 ring-mustard/60' : ''}`} onClick={check} disabled={loading}>
          {loading ? t('log.checking') : t('log.check')}
        </Button>
      </Card>

      {loading && (
        <div className="mt-6 space-y-3" aria-busy="true">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      )}

      {healthData?.photo_enabled && (
        <Card className="mt-6">
          <div className="flex items-start gap-3">
            <Camera className="mt-1 shrink-0 text-olive-700" aria-hidden />
            <div className="flex-1">
              <h2 className="text-lg">{t('photo.title')}</h2>
              <p className="text-muted">{t('photo.text')}</p>
              <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-xl border-2 border-olive-700 bg-white px-5 font-semibold text-olive-700 hover:bg-olive-50 focus-within:outline focus-within:outline-3 focus-within:outline-olive-600">
                {t('photo.choose')}
                <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
              </label>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function ReviewRowCard({ row, onChange, onRemove }: { row: ReviewRow; onChange: (p: Partial<ReviewRow>) => void; onRemove: () => void }) {
  const { t, lang } = useApp()
  const [picking, setPicking] = useState(!row.food)
  const qtyId = useId()
  const unitId = useId()
  const unmatched = !row.food

  return (
    <div className={`rounded-2xl border-2 bg-white p-4 shadow-soft ${unmatched ? 'border-danger/50 bg-danger-50' : 'border-olive-100'}`}>
      {unmatched && row.rawName && (
        <div className="mb-3">
          <p className="font-semibold text-danger">
            {t('review.unmatchedTitle')}: “{row.rawName}”
          </p>
          <p className="text-sm text-muted">{t('review.unmatchedHelp')}</p>
          {row.suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">{t('review.didYouMean')}</span>
              {row.suggestions.map((s) => (
                <Chip key={s.id} onClick={() => (onChange({ food: s, confidence: 1 }), setPicking(false))}>
                  {foodName(s, lang)}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t('review.food')}</span>
          {picking || !row.food ? (
            <FoodPicker
              initialQuery={row.food ? '' : row.rawName}
              autoFocus={!!row.food || !row.rawName}
              onSelect={(f) => (onChange({ food: f, confidence: 1 }), setPicking(false))}
              onCancel={() => row.food && setPicking(false)}
            />
          ) : (
            <div className="flex min-h-11 flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-ink">{foodName(row.food, lang)}</span>
              {!row.food.verified && <Badge tone="neutral">{t('badge.unverified')}</Badge>}
              {row.confidence < 0.9 && <Badge tone="warn">{t('badge.notSure')}</Badge>}
              <button type="button" onClick={() => setPicking(true)} className="min-h-11 rounded-lg px-2 text-sm font-semibold text-olive-700 underline underline-offset-4 hover:bg-olive-50">
                {t('review.change')}
              </button>
            </div>
          )}
        </div>

        <div className="w-24">
          <label htmlFor={qtyId} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            {t('review.quantity')}
          </label>
          <input
            id={qtyId}
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            placeholder={fmtNum(1, lang)}
            value={row.quantity ?? ''}
            onChange={(e) => onChange({ quantity: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
            className="min-h-11 w-full rounded-xl border-2 border-olive-200 bg-white px-3 focus:border-olive-600 focus:outline-none"
          />
        </div>

        <div className="w-36">
          <label htmlFor={unitId} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            {t('review.unit')}
          </label>
          <select
            id={unitId}
            value={row.unit ?? 'serving'}
            onChange={(e) => onChange({ unit: e.target.value === 'serving' ? null : e.target.value })}
            className="min-h-11 w-full rounded-xl border-2 border-olive-200 bg-white px-2 focus:border-olive-600 focus:outline-none"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {t(unitKey(u))}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label={`${t('common.remove')}${row.food ? `: ${foodName(row.food, lang)}` : row.rawName ? `: ${row.rawName}` : ''}`}
          className="mt-5 grid size-11 place-items-center rounded-xl text-danger hover:bg-danger-50"
        >
          <Trash2 size={20} aria-hidden />
        </button>
      </div>

      {row.food && (
        <p className="mt-2 text-sm text-muted">
          {t('review.approx', { g: fmtNum(previewGrams(row.food, row.quantity, row.unit), lang) })}
          {row.quantity == null && <> · {t('review.assumedHint', { serving: servingDesc(row.food, lang) })}</>}
        </p>
      )}
    </div>
  )
}
