import { useEffect, useMemo, useState } from 'react'
import { FlaskConical, PauseCircle } from 'lucide-react'
import { useAppStore, useMode, useT } from '@/app/store'
import { Tabs } from '@/components/Tabs'
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

  return (
    <>
      <PageTitle>{t('route.progress')}</PageTitle>

      <Tabs idPrefix="prog" label={t('prog.views')} tabs={VIEWS.map((v) => ({ id: v.id, label: t(v.label) }))} value={view} onChange={setView} />

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

      <div role="tabpanel" id={`prog-panel-${view}`} aria-labelledby={`prog-tab-${view}`} className="flex flex-col gap-4">
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
