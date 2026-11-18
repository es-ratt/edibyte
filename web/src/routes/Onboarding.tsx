import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Info, ShieldAlert } from 'lucide-react'
import { useAppStore, useT } from '@/app/store'
import { CheckGroup, Field, inputClass, OptionGroup, SwitchRow } from '@/components/form'
import { Button, Card, PageTitle } from '@/components/ui'
import {
  ACTIVITIES, ageOn, AVOIDS, birthYearOptions, DIETS, EAT_PLACES, EMPTY_PROFILE, GOALS, isTeen,
  LIMITS, MAX_AGE, MEALS_PER_DAY, MIN_AGE, parseOptionalNumber, SEXES, type Profile,
} from '@/features/profile/model' // fmt: skip
import { fmtNum, htmlLang, type TKey } from '@/lib/i18n'

const STEPS: TKey[] = ['ob.s1', 'ob.s2', 'ob.s3', 'ob.s4']

type Draft = Omit<Profile, 'birthYear' | 'birthMonth' | 'heightCm' | 'weightKg' | 'budgetBdt'> & {
  birthYear: number | null
  birthMonth: number | null
  height: string
  weight: string
  budget: string
}

function toDraft(p: Profile | null): Draft {
  const base = p ?? { ...EMPTY_PROFILE, birthYear: 0, birthMonth: 0 }
  return {
    ...base,
    birthYear: p ? p.birthYear : null,
    birthMonth: p ? p.birthMonth : null,
    height: base.heightCm == null ? '' : String(base.heightCm),
    weight: base.weightKg == null ? '' : String(base.weightKg),
    budget: base.budgetBdt == null ? '' : String(base.budgetBdt),
  }
}

export default function Onboarding() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const saved = useAppStore((s) => s.profile)
  const setProfile = useAppStore((s) => s.setProfile)
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [d, setD] = useState<Draft>(() => toDraft(saved))
  const [showErrors, setShowErrors] = useState(false)

  const patch = (p: Partial<Draft>) => setD((prev) => ({ ...prev, ...p }))
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const monthName = (m: number) => new Intl.DateTimeFormat(htmlLang(lang) === 'bn' ? 'bn-BD' : 'en-GB', { month: 'long' }).format(new Date(2000, m - 1, 1))

  const age = d.birthYear && d.birthMonth ? ageOn(d.birthYear, d.birthMonth) : null
  const tooYoung = age !== null && age < MIN_AGE
  const teen = age !== null && !tooYoung && isTeen(age)
  const height = parseOptionalNumber(d.height, LIMITS.heightCm.min, LIMITS.heightCm.max)
  const weight = parseOptionalNumber(d.weight, LIMITS.weightKg.min, LIMITS.weightKg.max)
  const budget = parseOptionalNumber(d.budget, LIMITS.budgetBdt.min, LIMITS.budgetBdt.max)

  const stepValid = [age !== null && !tooYoung && age <= MAX_AGE, height !== 'invalid' && weight !== 'invalid', true, budget !== 'invalid']

  const numErr = (v: number | null | 'invalid', lim: { min: number; max: number }) =>
    v === 'invalid' ? t('ob.invalidNumber', { min: fmtNum(lim.min, lang), max: fmtNum(lim.max, lang) }) : null

  const handleNext = async () => {
    if (!stepValid[step]) {
      setShowErrors(true)
      return
    }
    setShowErrors(false)
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      return
    }
    const profile: Profile = {
      birthYear: d.birthYear!,
      birthMonth: d.birthMonth!,
      sex: d.sex,
      heightCm: height === 'invalid' ? null : height,
      weightKg: weight === 'invalid' ? null : weight,
      activity: d.activity,
      goal: d.goal,
      diet: d.diet,
      avoid: d.avoid,
      mealsPerDay: d.mealsPerDay,
      eatPlaces: d.eatPlaces,
      fasting: d.fasting,
      budgetBdt: budget === 'invalid' ? null : budget,
    }
    await setProfile(profile)
    navigate('/')
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void handleNext()
      }}
      noValidate
    >
      <PageTitle>{t('route.onboarding')}</PageTitle>
      <p className="mb-1 text-sm font-semibold text-muted" aria-live="polite">
        {t('ob.step', { n: fmtNum(step + 1, lang), total: fmtNum(STEPS.length, lang) })}
      </p>
      <h2 className="mb-4 text-xl font-semibold text-olive-900">{t(STEPS[step])}</h2>

      {teen && (
        <Card tone="tint" className="mb-4 flex gap-3">
          <Info size={20} aria-hidden className="mt-0.5 shrink-0 text-olive-700" />
          <p className="text-ink">{t('ob.teenBanner')}</p>
        </Card>
      )}

      <div className="flex flex-col gap-5">
        {step === 0 && (
          <>
            <fieldset>
              <legend className="mb-1 font-semibold text-olive-900">{t('ob.birth')}</legend>
              <p className="mb-2 text-sm text-muted">{t('ob.birthWhy')}</p>
              <div className="grid grid-cols-2 gap-3">
                <Field id="birth-year" label={t('ob.birthYear')}>
                  <select
                    id="birth-year"
                    className={inputClass}
                    value={d.birthYear ?? ''}
                    onChange={(e) => patch({ birthYear: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">{t('ob.choose')}</option>
                    {birthYearOptions().map((y) => (
                      <option key={y} value={y}>
                        {fmtNum(y, lang).replace(',', '')}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="birth-month" label={t('ob.birthMonth')}>
                  <select
                    id="birth-month"
                    className={inputClass}
                    value={d.birthMonth ?? ''}
                    onChange={(e) => patch({ birthMonth: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">{t('ob.choose')}</option>
                    {months.map((m) => (
                      <option key={m} value={m}>
                        {monthName(m)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              {showErrors && age === null && (
                <p role="alert" className="mt-2 text-sm font-semibold text-ink">
                  {t('ob.birthRequired')}
                </p>
              )}
            </fieldset>
            {tooYoung && (
              <Card tone="mustard" className="flex gap-3">
                <ShieldAlert size={20} aria-hidden className="mt-0.5 shrink-0 text-amber-ink" />
                <p role="alert">{t('ob.tooYoung')}</p>
              </Card>
            )}
            <OptionGroup legend={t('ob.sex')} name="sex" options={SEXES} value={d.sex} onChange={(sex) => patch({ sex })} label={(s) => t(`sex.${s}`)} />
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-muted">{t('ob.bodyWhy')}</p>
            <div className="grid grid-cols-2 gap-3">
              <Field id="height" label={`${t('ob.height')} (${t('ob.optional')})`} error={numErr(height, LIMITS.heightCm)}>
                <input
                  id="height"
                  inputMode="decimal"
                  className={inputClass}
                  value={d.height}
                  onChange={(e) => patch({ height: e.target.value })}
                  aria-describedby="height-msg"
                  aria-invalid={height === 'invalid'}
                />
              </Field>
              <Field id="weight" label={`${t('ob.weight')} (${t('ob.optional')})`} error={numErr(weight, LIMITS.weightKg)}>
                {/* Teen mode: what the user types is visible while typing, but weight is never shown back anywhere. */}
                <input
                  id="weight"
                  inputMode="decimal"
                  className={inputClass}
                  value={d.weight}
                  onChange={(e) => patch({ weight: e.target.value })}
                  aria-describedby="weight-msg"
                  aria-invalid={weight === 'invalid'}
                />
              </Field>
            </div>
            <OptionGroup legend={t('ob.activity')} name="activity" options={ACTIVITIES} value={d.activity} onChange={(activity) => patch({ activity })} label={(a) => t(`act.${a}`)} hint={(a) => t(`act.${a}Ex`)} />
          </>
        )}

        {step === 2 && (
          <>
            <OptionGroup legend={t('ob.goal')} name="goal" options={GOALS} value={d.goal} onChange={(goal) => patch({ goal })} label={(g) => t(`goal.${g}`)} />
            <p className="flex gap-2 text-sm text-muted">
              <Info size={16} aria-hidden className="mt-0.5 shrink-0" />
              {t('ob.weightConcern')}
            </p>
            <OptionGroup legend={t('ob.diet')} name="diet" options={DIETS} value={d.diet} onChange={(diet) => patch({ diet })} label={(x) => t(`diet.${x}`)} />
            <CheckGroup
              legend={t('ob.avoid')}
              options={AVOIDS}
              values={d.avoid}
              onChange={(avoid) => patch({ avoid })}
              label={(a) => t(`avoid.${a}`)}
              note={
                <p className="mb-2 flex gap-2 rounded-2xl border border-terracotta bg-terracotta-50 p-3 text-sm text-ink">
                  <ShieldAlert size={18} aria-hidden className="mt-0.5 shrink-0 text-terracotta" />
                  {t('ob.avoidNote')}
                </p>
              }
            />
          </>
        )}

        {step === 3 && (
          <>
            <OptionGroup legend={t('ob.meals')} name="meals" options={MEALS_PER_DAY} value={d.mealsPerDay as (typeof MEALS_PER_DAY)[number]} onChange={(mealsPerDay) => patch({ mealsPerDay })} label={(n) => fmtNum(n, lang)} columns={3} />
            <CheckGroup legend={t('ob.where')} options={EAT_PLACES} values={d.eatPlaces} onChange={(eatPlaces) => patch({ eatPlaces })} label={(p) => t(`where.${p}`)} />
            <SwitchRow label={t('ob.fasting')} checked={d.fasting} onChange={(fasting) => patch({ fasting })} />
            <Field id="budget" label={`${t('ob.budget')} (${t('ob.optional')})`} error={numErr(budget, LIMITS.budgetBdt)}>
              <input id="budget" inputMode="numeric" className={inputClass} value={d.budget} onChange={(e) => patch({ budget: e.target.value })} aria-describedby="budget-msg" aria-invalid={budget === 'invalid'} />
            </Field>
          </>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep(step - 1)}>
            {t('ob.back')}
          </Button>
        )}
        <Button type="submit" block disabled={step === 0 && tooYoung}>
          {step < STEPS.length - 1 ? t('ob.next') : t('ob.save')}
        </Button>
      </div>
    </form>
  )
}
