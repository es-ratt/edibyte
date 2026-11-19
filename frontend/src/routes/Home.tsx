import { useEffect, useState } from 'react'
import { CalendarCheck, Camera, PauseCircle, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppStore, useMode, useT } from '@/app/store'
import { Card, Chip, PageTitle } from '@/components/ui'
import { SupportCard } from '@/features/safety/SafetyCards'
import { getPlan, listMeals } from '@/lib/db'
import { dayPlanId, planFoodIds, type DayPlan } from '@/lib/plans/model'
import { fmtNum } from '@/lib/i18n'
import { htmlLang } from '@/lib/i18n'

/** Monday-first week containing `day`, as 7 local dates. */
export function weekDays(day: Date = new Date()): Date[] {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

function WeekDots() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const [logged, setLogged] = useState<Date[]>([])
  const days = weekDays()

  useEffect(() => {
    const d = weekDays()
    const end = new Date(d[6].getFullYear(), d[6].getMonth(), d[6].getDate() + 1)
    let active = true
    listMeals(d[0].toISOString(), end.toISOString()).then((meals) => active && setLogged(meals.map((m) => new Date(m.eatenAt))))
    return () => {
      active = false
    }
  }, [])

  const fmt = new Intl.DateTimeFormat(htmlLang(lang) === 'bn' ? 'bn-BD' : 'en-GB', { weekday: 'short' })
  return (
    <Card as="section" labelledBy="week-title">
      <h2 id="week-title" className="font-semibold text-olive-900">
        {t('home.week')}
      </h2>
      {/* Dots only: no score, no streak, nothing to "lose". */}
      <ul className="mt-3 grid grid-cols-7 gap-1 text-center">
        {days.map((d) => {
          const has = logged.some((m) => sameDay(m, d))
          const label = fmt.format(d)
          return (
            <li key={d.toISOString()} className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted" aria-hidden>
                {label}
              </span>
              <span
                role="img"
                aria-label={t(has ? 'home.dayLogged' : 'home.dayEmpty', { day: label })}
                className={`size-5 rounded-full ${has ? 'bg-olive-700' : 'border-2 border-line'}`}
              />
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-sm text-muted">{t('home.weekNote')}</p>
    </Card>
  )
}

function TodayPlanCard() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    let active = true
    getPlan<DayPlan>(dayPlanId(new Date())).then((p) => active && setCount(p ? planFoodIds(p).length : 0))
    return () => {
      active = false
    }
  }, [])
  return (
    <Card as="section" labelledBy="plan-title" className="flex items-center justify-between gap-3">
      <div>
        <h2 id="plan-title" className="font-semibold text-olive-900">
          {t('home.plan')}
        </h2>
        <p className="text-sm text-muted">{count ? t('home.planToday', { n: fmtNum(count, lang) }) : t('home.planNone')}</p>
      </div>
      <Link to="/plans" className="inline-flex min-h-tap shrink-0 items-center gap-1 font-semibold text-olive-700 underline underline-offset-4">
        <CalendarCheck size={18} aria-hidden />
        {count ? t('home.planOpen') : t('home.planCta')}
      </Link>
    </Card>
  )
}

export default function Home() {
  const t = useT()
  const mode = useMode()
  const flagged = useAppStore((s) => s.safety.wellbeingFlagged)

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <PageTitle>{t('home.hello')}</PageTitle>
        {mode.teen && (
          <Chip icon={ShieldCheck} tone="olive">
            {t('teen.chip')}
          </Chip>
        )}
      </div>

      {flagged && (
        <div className="mb-4">
          <SupportCard />
        </div>
      )}

      <div className="flex flex-col gap-4">
        {mode.trackingHidden ? (
          <Card className="flex items-start gap-3">
            <PauseCircle size={22} aria-hidden className="mt-0.5 shrink-0 text-olive-700" />
            <p>{t('home.paused')}</p>
          </Card>
        ) : (
          <>
            <Card as="section" labelledBy="photo-card" tone="olive">
              <h2 id="photo-card" className="text-xl font-semibold">
                {t('home.photoTitle')}
              </h2>
              <p className="mt-1 text-white/90">{t('home.photoBody')}</p>
              <Link to="/capture" className="mt-4 inline-flex min-h-tap items-center gap-2 rounded-2xl bg-white px-5 font-semibold text-olive-900">
                <Camera size={20} aria-hidden />
                {t('home.photoCta')}
              </Link>
            </Card>
            <WeekDots />
          </>
        )}

        <TodayPlanCard />
      </div>
    </>
  )
}
