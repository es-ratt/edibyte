import { History as HistoryIcon, Trash2 } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Button, ButtonLink } from '@/components/Button'
import { Card, CardTitle } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonCard } from '@/components/Skeleton'
import { EMPTY_DRAFT, useApp } from '@/hooks/useApp'
import { clearHistory, lastDays, loadHistory } from '@/lib/history'
import { fmtNum, type TKey } from '@/lib/i18n'

const HistoryChart = lazy(() => import('@/components/HistoryChart'))

// Same energy estimate the profile page uses when no backend target is available yet.
function dailyTarget(p: { weight_kg: number; height_cm: number; age: number; sex: string }): number {
  const bmr = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + (p.sex === 'male' ? 5 : p.sex === 'female' ? -161 : -78)
  return Math.max(1200, Math.round(bmr * 1.4))
}

const MEAL_KEY: Record<string, TKey> = { breakfast: 'meal.breakfast', lunch: 'meal.lunch', dinner: 'meal.dinner', snack: 'meal.snack' }

export default function History() {
  const { t, lang, profile, setDraft } = useApp()
  const [entries, setEntries] = useState(loadHistory)
  const days = useMemo(() => lastDays(entries, 7), [entries])
  const n = (v: number, d = 0) => fmtNum(v, lang, d)
  const locale = lang === 'bn' ? 'bn-BD' : 'en-US'

  if (!entries.length) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={t('history.title')} subtitle={t('history.subtitle')} />
        <EmptyState
          icon={<HistoryIcon aria-hidden />}
          title={t('history.emptyTitle')}
          text={t('history.emptyText')}
          action={
            <ButtonLink to="/log" onClick={() => setDraft(EMPTY_DRAFT)}>
              {t('home.logFirst')}
            </ButtonLink>
          }
        />
      </div>
    )
  }

  const withMeals = days.filter((d) => d.meals > 0)
  const avgKcal = withMeals.length ? Math.round(withMeals.reduce((a, d) => a + d.kcal, 0) / withMeals.length) : 0
  const avgProtein = withMeals.length ? withMeals.reduce((a, d) => a + d.protein_g, 0) / withMeals.length : 0
  const target = dailyTarget(profile)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t('history.title')} subtitle={t('history.subtitle')}>
        <Button
          variant="ghost"
          icon={<Trash2 size={18} aria-hidden />}
          onClick={() => {
            clearHistory()
            setEntries([])
          }}
        >
          {t('history.clear')}
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-muted">{t('history.avgKcal')}</p>
          <p className="mt-1 text-3xl font-bold text-olive-900">{n(avgKcal)}</p>
          <p className="text-sm text-muted">{t('history.target', { n: n(target) })}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-muted">{t('history.avgProtein')}</p>
          <p className="mt-1 text-3xl font-bold text-olive-900">{n(avgProtein, 1)} {t('common.g')}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-muted">{t('history.mealsWeek')}</p>
          <p className="mt-1 text-3xl font-bold text-olive-900">{n(days.reduce((a, d) => a + d.meals, 0))}</p>
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle>{t('history.chartTitle')}</CardTitle>
        <Suspense fallback={<SkeletonCard lines={4} />}>
          <HistoryChart days={days} targetKcal={target} />
        </Suspense>
        <p className="mt-2 text-sm text-muted">{t('history.chartNote')}</p>
      </Card>

      <Card className="mt-4">
        <CardTitle>{t('history.recent')}</CardTitle>
        <ul className="divide-y divide-olive-100">
          {entries.slice(0, 15).map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-semibold text-olive-900">
                  {e.foods.map((f) => (lang === 'bn' ? f.bn : f.en)).join(', ')}
                </p>
                <p className="text-sm text-muted">
                  {new Date(e.ts).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                  {e.mealType && MEAL_KEY[e.mealType] ? ` · ${t(MEAL_KEY[e.mealType])}` : ''}
                </p>
              </div>
              <p className="text-sm font-semibold">
                {n(e.kcal)} {t('common.kcal')} · {n(e.protein_g, 1)} {t('common.g')} {t('common.protein')}
              </p>
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-4 text-sm text-muted">{t('history.privacy')}</p>
    </div>
  )
}
