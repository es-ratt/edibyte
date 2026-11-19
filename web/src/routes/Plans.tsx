import { useMemo, useState } from 'react'
import { useT } from '@/app/store'
import { Tabs } from '@/components/Tabs'
import { PageTitle } from '@/components/ui'
import { DayPlanView } from '@/features/plans/DayPlanView'
import { MonthPlanView, WeekPlanView } from '@/features/plans/WeekMonthViews'

type View = 'day' | 'week' | 'month'

export default function Plans() {
  const t = useT()
  const [view, setView] = useState<View>('day')
  const today = useMemo(() => new Date(), [])
  const tabs: { id: View; label: string }[] = [
    { id: 'day', label: t('plan.day') },
    { id: 'week', label: t('plan.week') },
    { id: 'month', label: t('plan.month') },
  ]
  return (
    <>
      <PageTitle>{t('route.plans')}</PageTitle>
      <Tabs idPrefix="plan" label={t('plan.views')} tabs={tabs} value={view} onChange={setView} />
      <div role="tabpanel" id={`plan-panel-${view}`} aria-labelledby={`plan-tab-${view}`}>
        {view === 'day' && <DayPlanView today={today} />}
        {view === 'week' && <WeekPlanView today={today} />}
        {view === 'month' && <MonthPlanView today={today} />}
      </div>
    </>
  )
}
