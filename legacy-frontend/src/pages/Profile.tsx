import { Check, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { Button } from '@/components/Button'
import { Card, CardTitle } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { useApp } from '@/hooks/useApp'
import { fmtNum, type TKey } from '@/lib/i18n'
import { api } from '@/services/api'
import type { Activity, Diet, Goal, Profile as ProfileT, Sex, Targets } from '@/types/api'

// Must match backend PROFILE_LIMITS (nutrition_config.py).
const LIMITS = { age: [18, 80], height_cm: [120, 220], weight_kg: [30, 200] } as const
type NumField = keyof typeof LIMITS

const GOALS: Goal[] = ['lose', 'maintain', 'gain_muscle']
const SEXES: Sex[] = ['female', 'male', 'unspecified']
const ACTIVITIES: Activity[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']
const DIETS: Diet[] = ['any', 'vegetarian', 'no_beef']

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-semibold text-olive-900">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="mt-1 text-sm font-semibold text-danger">{error}</p>
      ) : (
        hint && <p id={`${id}-msg`} className="mt-1 text-sm text-muted">{hint}</p>
      )}
    </div>
  )
}

const inputCls = (bad?: boolean) =>
  `min-h-11 w-full rounded-xl border-2 bg-white px-3 focus:outline-none ${bad ? 'border-danger' : 'border-olive-200 focus:border-olive-600'}`

export default function Profile() {
  const { t, lang, profile, profileSource, setProfile, demos, applyDemo, switchToOwnProfile, clearMyData } = useApp()
  const [nums, setNums] = useState<Record<NumField, string>>(() => ({
    age: String(profile.age), height_cm: String(profile.height_cm), weight_kg: String(profile.weight_kg),
  }))
  const [budget, setBudget] = useState(profile.daily_budget_bdt?.toString() ?? '')
  const [targets, setTargets] = useState<Targets | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [cleared, setCleared] = useState(false)
  const uid = useId()

  // Keep the text fields in sync when a demo profile is applied.
  // Only overwrite a field when its number differs, so typing "60." is not interrupted.
  useEffect(() => {
    setNums((cur) => {
      const next = { ...cur }
      for (const f of Object.keys(LIMITS) as NumField[]) if (Number(cur[f]) !== profile[f]) next[f] = String(profile[f])
      return next
    })
    setBudget((cur) => (Number(cur || NaN) === profile.daily_budget_bdt || (cur === '' && profile.daily_budget_bdt == null) ? cur : (profile.daily_budget_bdt?.toString() ?? '')))
  }, [profile])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => api.targets(profile).then((r) => !cancelled && setTargets(r)).catch(() => undefined), 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [profile])

  const invalid = (f: NumField) => {
    const v = Number(nums[f])
    return nums[f] === '' || Number.isNaN(v) || v < LIMITS[f][0] || v > LIMITS[f][1]
  }

  const update = (patch: Partial<ProfileT>) => setProfile({ ...profile, ...patch })
  const onNum = (f: NumField, value: string) => {
    setNums((n) => ({ ...n, [f]: value }))
    const v = Number(value)
    if (value !== '' && v >= LIMITS[f][0] && v <= LIMITS[f][1]) update({ [f]: f === 'age' ? Math.round(v) : v })
  }

  const n = (v: number) => fmtNum(v, lang)
  const rangeMsg = (f: NumField) => t('profile.range', { min: n(LIMITS[f][0]), max: n(LIMITS[f][1]) })

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <Card className="mb-5">
        <CardTitle>{t('profile.demoSwitch')}</CardTitle>
        <p className="mb-3 text-muted">{t('profile.demoHint')}</p>
        <div className="flex flex-wrap gap-2">
          {demos.map((d) => (
            <Chip key={d.id} selected={profileSource === d.id} onClick={() => applyDemo(d.id)}>
              {lang === 'bn' ? d.name_bn : lang === 'bl' ? d.name_bl : d.name_en}
              <span className="text-xs opacity-80">({t('badge.demo')})</span>
            </Chip>
          ))}
          <Chip selected={profileSource === 'custom'} onClick={switchToOwnProfile}>
            {t('profile.custom')}
          </Chip>
        </div>
        {profileSource !== 'custom' && <p className="mt-3 text-sm text-muted">{t('profile.demoActive')}</p>}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()} noValidate>
            <fieldset>
              <legend className="mb-2 font-semibold text-olive-900">{t('profile.goal')}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {GOALS.map((g) => (
                  <label key={g} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 ${profile.goal === g ? 'border-olive-700 bg-olive-50' : 'border-olive-200'}`}>
                    <input type="radio" name="goal" value={g} checked={profile.goal === g} onChange={() => update({ goal: g })} className="size-4 accent-olive-700" />
                    <span className="font-medium">{t(`goal.${g}` as TKey)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-semibold text-olive-900">{t('profile.sex')}</legend>
              <div className="flex flex-wrap gap-2">
                {SEXES.map((s) => (
                  <label key={s} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 ${profile.sex === s ? 'border-olive-700 bg-olive-50' : 'border-olive-200'}`}>
                    <input type="radio" name="sex" value={s} checked={profile.sex === s} onChange={() => update({ sex: s })} className="size-4 accent-olive-700" />
                    <span>{t(`sex.${s}` as TKey)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ['age', 'profile.age'],
                  ['height_cm', 'profile.height'],
                  ['weight_kg', 'profile.weight'],
                ] as const
              ).map(([f, label]) => (
                <Field key={f} id={`${uid}-${f}`} label={t(label)} error={invalid(f) ? rangeMsg(f) : undefined}>
                  <input
                    id={`${uid}-${f}`}
                    type="number"
                    inputMode="decimal"
                    min={LIMITS[f][0]}
                    max={LIMITS[f][1]}
                    value={nums[f]}
                    aria-invalid={invalid(f)}
                    aria-describedby={invalid(f) ? `${uid}-${f}-msg` : undefined}
                    onChange={(e) => onNum(f, e.target.value)}
                    className={inputCls(invalid(f))}
                  />
                </Field>
              ))}
            </div>
            <p className="-mt-2 text-sm text-muted">{t('profile.adultsOnly')}</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={`${uid}-act`} label={t('profile.activity')}>
                <select id={`${uid}-act`} value={profile.activity} onChange={(e) => update({ activity: e.target.value as Activity })} className={inputCls()}>
                  {ACTIVITIES.map((a) => (
                    <option key={a} value={a}>{t(`activity.${a}` as TKey)}</option>
                  ))}
                </select>
              </Field>
              <Field id={`${uid}-diet`} label={t('profile.diet')}>
                <select id={`${uid}-diet`} value={profile.diet} onChange={(e) => update({ diet: e.target.value as Diet })} className={inputCls()}>
                  {DIETS.map((d) => (
                    <option key={d} value={d}>{t(`diet.${d}` as TKey)}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field id={`${uid}-budget`} label={t('profile.budget')} hint={t('profile.budgetHint')}>
              <input
                id={`${uid}-budget`}
                type="number"
                inputMode="numeric"
                min={0}
                value={budget}
                aria-describedby={`${uid}-budget-msg`}
                onChange={(e) => {
                  setBudget(e.target.value)
                  const v = Number(e.target.value)
                  if (e.target.value === '') update({ daily_budget_bdt: null })
                  else if (v >= 0 && v <= 100000) update({ daily_budget_bdt: v })
                }}
                className={inputCls()}
              />
            </Field>
          </form>
        </Card>

        <div className="space-y-5">
          <Card className="bg-olive-50" aria-live="polite">
            <CardTitle>{t('profile.targetsTitle')}</CardTitle>
            {targets ? (
              <dl className="space-y-3">
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-sm font-semibold text-muted">{t('common.calories')}</dt>
                  <dd className="text-3xl font-bold text-olive-900">
                    {n(targets.kcal)} <span className="text-base font-semibold text-muted">{t('common.kcal')} / {t('profile.perDay')}</span>
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['common.protein', targets.protein_g],
                      ['common.carbs', targets.carbs_g],
                      ['common.fat', targets.fat_g],
                      ['common.fiber', targets.fiber_g],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-white p-3">
                      <dt className="text-sm text-muted">{t(k)}</dt>
                      <dd className="text-lg font-bold text-ink">{n(v)} {t('common.g')}</dd>
                    </div>
                  ))}
                </div>
                <div className="text-sm text-muted">
                  <dt className="inline">{t('profile.bmr')}: </dt>
                  <dd className="inline">{n(targets.bmr)} {t('common.kcal')}</dd>
                </div>
              </dl>
            ) : (
              <div className="space-y-2" aria-hidden>
                <Skeleton className="h-20" />
                <Skeleton className="h-16" />
              </div>
            )}
            {targets?.floor_applied && <p className="mt-3 text-sm text-muted">{t('report.floorNote', { kcal: n(targets.floor_kcal) })}</p>}
            <p className="mt-3 text-sm text-muted">{t('profile.targetsNote')}</p>
          </Card>

          <Card>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-olive-600" aria-hidden /> {t('profile.privacyTitle')}
            </CardTitle>
            <p className="text-muted">{t('profile.privacyText')}</p>
            {cleared && (
              <p role="status" className="mt-3 flex items-center gap-2 font-semibold text-olive-700">
                <Check size={18} aria-hidden /> {t('profile.cleared')}
              </p>
            )}
            {!confirming ? (
              <Button variant="outline" className="mt-4 border-danger text-danger hover:bg-danger-50" icon={<Trash2 size={18} aria-hidden />} onClick={() => (setConfirming(true), setCleared(false))}>
                {t('profile.clear')}
              </Button>
            ) : (
              <div role="alertdialog" aria-labelledby={`${uid}-confirm`} className="mt-4 rounded-xl border border-danger/30 bg-danger-50 p-4">
                <p id={`${uid}-confirm`} className="font-semibold text-danger">{t('profile.clearConfirm')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    className="bg-danger hover:bg-danger/90"
                    autoFocus
                    onClick={async () => {
                      await clearMyData().catch(() => undefined)
                      setConfirming(false)
                      setCleared(true)
                    }}
                  >
                    {t('profile.clearYes')}
                  </Button>
                  <Button variant="outline" onClick={() => setConfirming(false)}>
                    {t('profile.clearNo')}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
