import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { FlaskConical, PauseCircle } from 'lucide-react'
import { useAppStore, useMode, useT } from '@/app/store'
import { Button, Card, PageTitle } from '@/components/ui'
import { DayRows, HabitsCard, MonthView, SuggestionCard, YearView } from '@/features/progress/views'
import { listMeals } from '@/lib/db'
import { flagsOf, sampleMeals, summarizeWeek, weekStart, type MealFlags } from '@/lib/progress/habits'
import type { TKey } from '@/lib/i18n'

type View = 'week' | 'month' | 'year'
const VIEWS: { id: View; label: TKey }[] = [
  { id: 'week', label: 'prog.week' },
  { id: 'month', label: 'prog.month' },
  { id: 'year', label: 'prog.year' },
]

export default function Progress() {
  const t = useT()
  const mode = useMode()
  const mealsPerDay = useAppStore((s) => s.profile?.mealsPerDay ?? 3)
  const [view, setView] = useState<View>('week')
  const [logged, setLogged] = useState<MealFlags[] | null>(null)
  const [sample, setSample] = useState(false)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const today = useMemo(() => new Date(), [])

  useEffect(() => {
    let active = true
    listMeals('2000-01-01', '2100-01-01').then((m) => active && setLogged(m.map(flagsOf)))
    return () => {
      active = false
    }
  }, [])

  if (mode.trackingHidden) {
    return (
      <>
        <PageTitle>{t('route.progress')}</PageTitle>
        <Card className="flex items-start gap-3">
          <PauseCircle size={22} aria-hidden className="mt-0.5 shrink-0 text-olive-700" />
          <p>{t('home.paused')}</p>
        </Card>
      </>
    )
  }

  const meals = sample ? sampleMeals(today) : (logged ?? [])
  const week = summarizeWeek(meals, weekStart(today), mealsPerDay)
  const fewReal = (logged?.length ?? 0) < 3

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const handleKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const next = (i + (e.key === 'ArrowRight' ? 1 : VIEWS.length - 1)) % VIEWS.length
    setView(VIEWS[next].id)
    tabs.current[next]?.focus()
  }

  return (
    <>
      <PageTitle>{t('route.progress')}</PageTitle>

      <div role="tablist" aria-label={t('prog.views')} className="mb-4 grid grid-cols-3 rounded-2xl bg-olive-50 p-1">
        {VIEWS.map((v, i) => (
          <button
            key={v.id}
            ref={(el) => {
              tabs.current[i] = el
            }}
            role="tab"
            id={`tab-${v.id}`}
            aria-selected={view === v.id}
            aria-controls={`panel-${v.id}`}
            tabIndex={view === v.id ? 0 : -1}
            onClick={() => setView(v.id)}
            onKeyDown={(e) => handleKey(e, i)}
            className={`min-h-tap rounded-xl font-semibold ${view === v.id ? 'bg-surface text-olive-900 shadow-card' : 'text-muted'}`}
          >
            {t(v.label)}
          </button>
        ))}
      </div>

      {sample && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-2xl bg-mustard-100 p-3 text-sm font-medium">
          <FlaskConical size={16} aria-hidden />
          {t('prog.sampleBanner')}
        </p>
      )}
      {logged && logged.length === 0 && !sample && <p className="mb-3 text-muted">{t('prog.empty')}</p>}
      {logged && fewReal && (
        <Button variant="secondary" className="mb-4" onClick={() => setSample(!sample)}>
          <FlaskConical size={18} aria-hidden />
          {t(sample ? 'prog.hideSample' : 'prog.showSample')}
        </Button>
      )}

      <div role="tabpanel" id={`panel-${view}`} aria-labelledby={`tab-${view}`} className="flex flex-col gap-4">
        {view === 'week' && (
          <>
            <SuggestionCard week={week} />
            <HabitsCard week={week} hideNumbers={mode.hideNumbers} />
            <DayRows meals={meals} start={weekStart(today)} />
          </>
        )}
        {view === 'month' && <MonthView meals={meals} today={today} mealsPerDay={mealsPerDay} />}
        {view === 'year' && (
          <>
            <YearView meals={meals} today={today} mealsPerDay={mealsPerDay} />
            <p className="text-sm text-muted">{t('prog.growth')}</p>
          </>
        )}
      </div>
    </>
  )
}
