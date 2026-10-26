import { AlertTriangle, ArrowRight, BarChart3, Lightbulb, MessageCircle, PenLine, Wallet } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Badge } from '@/components/Badge'
import { Button, ButtonLink } from '@/components/Button'
import { Card, CardTitle } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { ProgressBar } from '@/components/ProgressBar'
import { Skeleton, SkeletonCard } from '@/components/Skeleton'
import { EMPTY_DRAFT, errorKey, useApp } from '@/hooks/useApp'
import { foodName, unitKey } from '@/lib/food'
import { fmtNum, type TKey } from '@/lib/i18n'
import { addMeal } from '@/lib/history'
import { load, save } from '@/lib/storage'
import { api } from '@/services/api'
import type { ReportResponse } from '@/types/api'

// Recharts is the heaviest dependency; load it only on this page.
const MacroDonut = lazy(() => import('@/components/MacroDonut'))

export default function Report() {
  const { t, lang, apiLang, reportItems, reportMealType, profile, profileSource, demos, applyDemo, switchToOwnProfile, sessionId, setDraft, markReportLogged } = useApp()
  const [report, setReport] = useState<ReportResponse | null>(null)
  const [error, setError] = useState<TKey | null>(null)
  const [loading, setLoading] = useState(false)
  const [attempt, setAttempt] = useState(0)

  // Re-run the deterministic report whenever items, profile or language change.
  useEffect(() => {
    if (!reportItems?.length) return
    let cancelled = false
    setLoading(true)
    setError(null)
    // Log each meal once. The flag is read and claimed synchronously from storage before the request,
    // so profile switches, reloads and StrictMode's double effect run never create duplicate logs.
    const logNow = !load<boolean>('reportLogged', false)
    if (logNow) markReportLogged()
    api
      .report(reportItems, profile, apiLang, reportMealType, logNow ? sessionId : null)
      .then((r) => {
        // Save to the on-device history once per meal, even if this effect run was cancelled (StrictMode).
        if (logNow) {
          addMeal({
            ts: Date.now(),
            mealType: reportMealType,
            kcal: r.totals.kcal,
            protein_g: r.totals.protein_g,
            carbs_g: r.totals.carbs_g,
            fat_g: r.totals.fat_g,
            foods: r.items.map((i) => ({ bn: i.food.name_bn, en: i.food.name_en })),
          })
        }
        if (!cancelled) setReport(r)
      })
      .catch((e) => {
        // Request failed before the meal was saved: release the claim so Retry can still log it.
        if (logNow) save('reportLogged', false)
        if (!cancelled) setError(errorKey(e))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [reportItems, profile, apiLang, reportMealType, sessionId, attempt, markReportLogged])

  if (!reportItems?.length) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={t('report.title')} />
        <EmptyState
          icon={<BarChart3 aria-hidden />}
          title={t('report.emptyTitle')}
          text={t('report.emptyText')}
          action={
            <ButtonLink to="/log" onClick={() => setDraft(EMPTY_DRAFT)}>
              {t('home.logFirst')}
            </ButtonLink>
          }
        />
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={t('report.title')} />
        <EmptyState tone="error" icon={<AlertTriangle aria-hidden />} title={t(error)} action={<Button onClick={() => setAttempt((a) => a + 1)}>{t('common.retry')}</Button>} />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-5xl space-y-4" aria-busy="true">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
        <SkeletonCard lines={4} />
      </div>
    )
  }

  const { totals, targets, percent_of_target: pct } = report
  const n = (v: number, d = 0) => fmtNum(v, lang, d)
  const profileChoices = [
    ...demos.map((d) => ({ id: d.id, label: lang === 'bn' ? d.name_bn : lang === 'bl' ? d.name_bl : d.name_en })),
    { id: 'custom', label: t('report.myProfile') },
  ]

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t('report.title')}>
        {loading && (
          <span role="status" className="text-sm text-muted">
            {t('report.updating')}
          </span>
        )}
      </PageHeader>

      {/* Demo-profile switch: targets and tips visibly change */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted">{t('report.seeAs')}:</span>
        {profileChoices.map((c) => (
          <Chip key={c.id} selected={profileSource === c.id} onClick={() => (c.id === 'custom' ? switchToOwnProfile() : applyDemo(c.id))}>
            {c.label}
            {c.id !== 'custom' && <span className="text-xs opacity-80">({t('badge.demo')})</span>}
          </Chip>
        ))}
      </div>

      {report.has_unverified && (
        <p role="note" className="mb-5 flex items-start gap-2 rounded-xl border border-mustard/50 bg-mustard-100 px-4 py-3 text-sm text-ink">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden /> {t('report.unverifiedNote')}
        </p>
      )}

      <div className={`grid gap-4 md:grid-cols-2 ${loading ? 'opacity-70' : ''}`}>
        {/* Headline number */}
        <Card>
          <p className="font-semibold text-muted">{t('report.thisMeal')}</p>
          <p className="mt-1 text-5xl font-bold text-olive-900">
            {n(totals.kcal)} <span className="text-2xl font-semibold text-muted">{t('common.kcal')}</span>
          </p>
          <p className="mt-2 text-muted">{t('report.ofTarget', { pct: n(pct.kcal), target: n(targets.kcal) })}</p>
          <div className="mt-4">
            <ProgressBar value={pct.kcal} label={t('common.calories')} detail={`${n(totals.kcal)} / ${n(targets.kcal)} ${t('common.kcal')}`} />
          </div>
          {targets.floor_applied && <p className="mt-3 text-sm text-muted">{t('report.floorNote', { kcal: n(targets.floor_kcal) })}</p>}
        </Card>

        <Card>
          <CardTitle>{t('report.macroShare')}</CardTitle>
          <Suspense fallback={<Skeleton className="h-44 w-full" />}>
            <MacroDonut totals={totals} />
          </Suspense>
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle>{t('report.vsDaily')}</CardTitle>
        <div className="grid gap-5 sm:grid-cols-2">
          {(
            [
              ['common.protein', 'protein_g'],
              ['common.carbs', 'carbs_g'],
              ['common.fat', 'fat_g'],
              ['common.fiber', 'fiber_g'],
            ] as const
          ).map(([label, key]) => (
            <ProgressBar key={key} value={pct[key]} label={t(label)} detail={`${n(totals[key], 1)} / ${n(targets[key])} ${t('common.g')} · ${n(pct[key])}%`} />
          ))}
        </div>
      </Card>

      {/* Per-item table */}
      <Card className="mt-4">
        <CardTitle>{t('report.items')}</CardTitle>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-sm text-muted">
                <th scope="col" className="px-2 py-2 font-semibold">{t('review.food')}</th>
                <th scope="col" className="px-2 py-2 font-semibold">{t('report.portion')}</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">{t('common.kcal')}</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">{t('common.protein')}</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">{t('common.carbs')}</th>
                <th scope="col" className="px-2 py-2 text-right font-semibold">{t('common.fat')}</th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((it, i) => (
                <tr key={`${it.food.id}-${i}`} className="align-top">
                  <th scope="row" className="border-t border-olive-100 px-2 py-3 font-semibold">
                    <span>{foodName(it.food, lang)}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {!it.food.verified && <Badge tone="neutral" title={it.source}>{t('badge.unverified')}</Badge>}
                      {it.assumed && <Badge tone="warn">{t('badge.assumed')}</Badge>}
                    </span>
                  </th>
                  <td className="border-t border-olive-100 px-2 py-3 text-muted">
                    {it.quantity != null ? `${n(it.quantity, 1)} ${t(unitKey(it.unit ?? 'serving'))}` : `${n(1)} ${t('unit.serving')}`}
                    <span className="block text-sm">≈ {n(it.grams)} {t('common.g')}</span>
                  </td>
                  <td className="border-t border-olive-100 px-2 py-3 text-right">{n(it.nutrients.kcal)}</td>
                  <td className="border-t border-olive-100 px-2 py-3 text-right">{n(it.nutrients.protein_g, 1)}</td>
                  <td className="border-t border-olive-100 px-2 py-3 text-right">{n(it.nutrients.carbs_g, 1)}</td>
                  <td className="border-t border-olive-100 px-2 py-3 text-right">{n(it.nutrients.fat_g, 1)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold text-olive-900">
                <th scope="row" colSpan={2} className="border-t-2 border-olive-200 px-2 py-3">{t('report.total')}</th>
                <td className="border-t-2 border-olive-200 px-2 py-3 text-right">{n(totals.kcal)}</td>
                <td className="border-t-2 border-olive-200 px-2 py-3 text-right">{n(totals.protein_g, 1)}</td>
                <td className="border-t-2 border-olive-200 px-2 py-3 text-right">{n(totals.carbs_g, 1)}</td>
                <td className="border-t-2 border-olive-200 px-2 py-3 text-right">{n(totals.fat_g, 1)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb size={20} className="text-mustard" aria-hidden /> {t('report.tips')}
          </CardTitle>
          <ul className="space-y-3">
            {report.tips.map((tip) => (
              <li key={tip.id} className="rounded-xl bg-olive-50 p-4">
                <p className="text-ink">{tip.text}</p>
                {!tip.verified && <Badge tone="neutral" className="mt-2" title={tip.source}>{t('badge.unverified')}</Badge>}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle className="flex items-center gap-2">
            <Wallet size={20} className="text-olive-600" aria-hidden /> {t('report.swaps')}
          </CardTitle>
          {report.swaps.length > 0 ? (
            <ul className="space-y-3">
              {report.swaps.map((s) => (
                <li key={s.from_food.id} className="rounded-xl border border-olive-100 p-4">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {foodName(s.from_food, lang)} <ArrowRight size={16} aria-hidden /> {foodName(s.to_food, lang)}
                    <Badge tone="warn">{t('badge.estimated')}</Badge>
                  </p>
                  <p className="mt-1 text-olive-900">{t('report.save', { n: n(s.saving_bdt) })}</p>
                  <p className="mt-1 text-sm text-muted">{t('report.priceFrom', { src: s.price_source ?? '-', date: s.price_date ?? '-' })}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">{report.swaps_note === 'no_cheaper_option' ? t('report.noCheaper') : t('report.noPrices')}</p>
          )}
        </Card>
      </div>

      <p className="mt-5 text-sm font-semibold text-muted">{report.disclaimer}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink to="/log" onClick={() => setDraft(EMPTY_DRAFT)} variant="outline">
          <PenLine size={18} aria-hidden /> {t('report.logAnother')}
        </ButtonLink>
        <ButtonLink to="/coach">
          <MessageCircle size={18} aria-hidden /> {t('report.askCoach')}
        </ButtonLink>
        <ButtonLink to="/history" variant="ghost">
          {t('nav.history')}
        </ButtonLink>
      </div>
    </div>
  )
}
