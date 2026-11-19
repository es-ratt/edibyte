import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CircleAlert, CircleCheck, Minus, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useAppStore, useT } from '@/app/store'
import { inputClass, OptionGroup } from '@/components/form'
import { Button, Card, Chip, PageTitle } from '@/components/ui'
import { useDraft, type DraftRow, type UnmatchedRow } from '@/features/capture/draft'
import { FoodSearch } from '@/features/capture/FoodSearch'
import { summarize } from '@/features/profile/model'
import { foodName, FoodIcon } from '@/features/report/food'
import { api } from '@/lib/api'
import { pieceWeightUnknown, toGrams } from '@/lib/check/engine'
import type { CheckAnswers, MealType } from '@/lib/check/types'
import { addWrongItemFeedback } from '@/lib/db'
import { fmtNum, type TKey } from '@/lib/i18n'

const UNITS = ['serving', 'plate', 'bati', 'piece', 'glass', 'cup', 'g', 'ml'] as const
const STEP: Record<string, number> = { g: 25, ml: 50 }
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const OIL: CheckAnswers['oil'][] = ['none', 'little', 'normal', 'lot', 'unknown']
const FRIED: CheckAnswers['fried'][] = ['yes', 'no', 'unknown']
const NOT_SURE_BELOW = 0.9

function Row({ row }: { row: DraftRow }) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const updateRow = useDraft((s) => s.updateRow)
  const removeRow = useDraft((s) => s.removeRow)
  const [replacing, setReplacing] = useState(false)
  const notSure = row.matchConfidence < NOT_SURE_BELOW
  const unit = row.unit ?? 'serving'
  const qty = row.quantity ?? 1
  const step = STEP[unit] ?? 0.5
  const [grams] = toGrams(row.food, row.quantity, unit)
  const name = foodName(row.food, lang)

  const setQty = (q: number) => updateRow(row.key, { quantity: Math.max(step, Math.round(q / step) * step) })

  const handleWrong = () => {
    void addWrongItemFeedback(row.food.id)
    setReplacing(true)
  }

  return (
    <li className={`rounded-card bg-surface p-4 shadow-card ${notSure ? 'border-2 border-mustard' : ''}`}>
      <div className="flex items-start gap-3">
        <FoodIcon category={row.food.category} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{name}</p>
          <div className="mt-1">
            {notSure ? (
              <Chip icon={CircleAlert} tone="amber">
                {t('conf.notSure')}
              </Chip>
            ) : (
              <Chip icon={CircleCheck} tone="olive">
                {t('conf.sure')}
              </Chip>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <span className="mb-1 block text-sm font-semibold text-olive-900" id={`${row.key}-amt`}>
            {t('conf.amount')}
          </span>
          <div className="flex items-center gap-1" role="group" aria-labelledby={`${row.key}-amt`}>
            <button type="button" aria-label={`${t('conf.amount')} −`} className="grid size-12 place-items-center rounded-2xl border border-line" onClick={() => setQty(qty - step)}>
              <Minus size={18} aria-hidden />
            </button>
            <span className="min-w-12 text-center font-semibold" aria-live="polite">
              {fmtNum(qty, lang, 1)}
            </span>
            <button type="button" aria-label={`${t('conf.amount')} +`} className="grid size-12 place-items-center rounded-2xl border border-line" onClick={() => setQty(qty + step)}>
              <Plus size={18} aria-hidden />
            </button>
          </div>
        </div>
        <div className="min-w-32 flex-1">
          <label htmlFor={`${row.key}-unit`} className="mb-1 block text-sm font-semibold text-olive-900">
            {t('conf.unit')}
          </label>
          <select
            id={`${row.key}-unit`}
            className={inputClass}
            value={unit}
            onChange={(e) => {
              const u = e.target.value
              // Switching to grams/ml starts from the current estimate so the amount does not jump.
              const q = u === 'g' || u === 'ml' ? Math.round(grams) : 1
              updateRow(row.key, { unit: u, quantity: q })
            }}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {t(`unit.${u}` as TKey)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">{t('conf.approx', { g: fmtNum(grams, lang) })}</p>
      {pieceWeightUnknown(row.food, row.quantity, row.unit) && (
        <p className="mt-1 flex gap-1 text-sm font-semibold text-ink">
          <TriangleAlert size={16} aria-hidden className="mt-0.5 shrink-0 text-amber-ink" />
          {t('conf.pieceUnknown', { serving: lang === 'bn' ? row.food.serving_desc_bn : row.food.serving_desc_en })}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="ghost" onClick={handleWrong}>
          <CircleAlert size={18} aria-hidden />
          {t('conf.wrong')}
        </Button>
        <Button variant="ghost" onClick={() => removeRow(row.key)}>
          <Trash2 size={18} aria-hidden />
          {t('conf.remove')}
        </Button>
      </div>
      {replacing && (
        <div className="mt-2">
          <p className="mb-2 text-sm text-muted" role="status">
            {t('conf.wrongThanks')}
          </p>
          <FoodSearch
            autoFocus
            onPick={(f) => {
              updateRow(row.key, { food: f, matchConfidence: 1, source: 'manual', quantity: null, unit: 'serving' })
              setReplacing(false)
            }}
          />
        </div>
      )}
    </li>
  )
}

function UnmatchedCard({ u }: { u: UnmatchedRow }) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const resolve = useDraft((s) => s.resolveUnmatched)
  return (
    <li className="rounded-card border-2 border-mustard bg-surface p-4 shadow-card">
      <p className="flex gap-2 font-semibold text-ink">
        <CircleAlert size={20} aria-hidden className="mt-0.5 shrink-0 text-amber-ink" />
        {t('conf.unmatched', { name: u.rawName })}
      </p>
      {u.suggestions.length > 0 && (
        <>
          <p className="mt-2 text-sm text-muted">{t('conf.didYouMean')}</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {u.suggestions.slice(0, 4).map((f) => (
              <li key={f.id}>
                <Button variant="secondary" onClick={() => resolve(u.key, f)}>
                  {foodName(f, lang)}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-3">
        <FoodSearch onPick={(f) => resolve(u.key, f)} />
      </div>
      <Button variant="ghost" className="mt-2" onClick={() => resolve(u.key, null)}>
        <Trash2 size={18} aria-hidden />
        {t('conf.skipUnmatched')}
      </Button>
    </li>
  )
}

export default function Confirm() {
  const t = useT()
  const navigate = useNavigate()
  const lang = useAppStore((s) => s.lang)
  const profile = useAppStore((s) => s.profile)
  const { rows, unmatched, answers, mealType, fromPhoto, setAnswers, setMealType, addFood, setResult } = useDraft()
  const [checking, setChecking] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!rows.length && !unmatched.length && !fromPhoto && !checking) {
    // Nothing to confirm (e.g. page reload: the draft is never persisted).
    return <Navigate to="/capture" replace />
  }

  const hasDrink = rows.some((r) => r.food.category === 'drink')

  const handleCheck = async () => {
    setChecking(true)
    setFailed(false)
    try {
      const result = await api.checkMeal({
        items: rows.map((r) => ({
          food_id: r.food.id,
          quantity: r.quantity,
          unit: r.unit ?? 'serving',
          source: r.source,
          match_confidence: r.matchConfidence,
        })),
        answers: hasDrink ? answers : { ...answers, sugar_spoons: null },
        // Only the summary leaves the device: age, sex, activity, goal, diet.
        profile: profile ? summarize(profile) : null,
        meal_type: mealType,
      })
      setResult(result)
      navigate('/result')
    } catch {
      setFailed(true)
    } finally {
      setChecking(false)
    }
  }

  return (
    <>
      <PageTitle>{t('route.confirm')}</PageTitle>
      <p className="mb-4 text-muted">{t('conf.intro')}</p>

      {unmatched.length > 0 && (
        <ul className="mb-3 flex flex-col gap-3">
          {unmatched.map((u) => (
            <UnmatchedCard key={u.key} u={u} />
          ))}
        </ul>
      )}

      {rows.length === 0 ? (
        <Card>
          <p className="text-muted">{t('conf.empty')}</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <Row key={r.key} row={r} />
          ))}
        </ul>
      )}

      <Card className="mt-4" as="section" labelledBy="add-title">
        <h2 id="add-title" className="mb-3 font-semibold text-olive-900">
          {t('conf.add')}
        </h2>
        <FoodSearch onPick={addFood} />
      </Card>

      <Card className="mt-4 flex flex-col gap-5" as="section" labelledBy="q-title">
        <h2 id="q-title" className="font-semibold text-olive-900">
          {t('conf.questions')}
        </h2>
        <OptionGroup legend={t('conf.oil')} name="oil" options={OIL} value={answers.oil} onChange={(oil) => setAnswers({ oil })} label={(o) => t(o === 'unknown' ? 'ans.unknown' : (`oil.${o}` as TKey))} columns={2} />
        <OptionGroup legend={t('conf.fried')} name="fried" options={FRIED} value={answers.fried} onChange={(fried) => setAnswers({ fried })} label={(o) => t(`ans.${o}` as TKey)} columns={3} />
        {hasDrink && (
          <OptionGroup
            legend={t('conf.sugar')}
            name="sugar"
            options={[0, 1, 2, 3, 4, 5]}
            value={answers.sugar_spoons ?? 0}
            onChange={(n) => setAnswers({ sugar_spoons: n })}
            label={(n) => fmtNum(n, lang)}
            columns={3}
          />
        )}
        <OptionGroup legend={t('conf.mealType')} name="meal" options={MEAL_TYPES} value={mealType} onChange={setMealType} label={(m) => t(`meal.${m}`)} columns={2} />
      </Card>

      {failed && (
        <p role="alert" className="mt-4 rounded-2xl bg-mustard-100 p-4 font-medium">
          {t('common.error')}
        </p>
      )}
      {/* Solid backdrop so the sticky button never shows content through it. */}
      <div className="sticky bottom-20 -mx-4 mt-6 bg-cream/95 px-4 py-2 backdrop-blur">
        <Button
          block
          className="disabled:bg-olive-200 disabled:text-olive-900 disabled:opacity-100"
          disabled={!rows.length || unmatched.length > 0 || checking}
          onClick={() => void handleCheck()}
        >
          {checking ? t('conf.checking') : t('conf.check')}
        </Button>
      </div>
    </>
  )
}
