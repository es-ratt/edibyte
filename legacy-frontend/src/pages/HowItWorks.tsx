import { Calculator, Database, MessageSquareText, Sparkles, WifiOff } from 'lucide-react'
import { Card, CardTitle } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { useApp } from '@/hooks/useApp'
import { fmtNum } from '@/lib/i18n'

export default function HowItWorks() {
  const { t, lang } = useApp()
  const steps = [
    { icon: MessageSquareText, title: t('how.s1'), text: t('how.s1t') },
    { icon: Sparkles, title: t('how.s2'), text: t('how.s2t') },
    { icon: Database, title: t('how.s3'), text: t('how.s3t'), highlight: true },
    { icon: Calculator, title: t('how.s4'), text: t('how.s4t') },
  ]
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t('how.title')} />

      {/* CSS flow diagram: vertical on mobile, horizontal on large screens */}
      <ol className="flex flex-col items-stretch gap-0 lg:flex-row" aria-label={t('how.title')}>
        {steps.map((s, i) => (
          <li key={s.title} className="flex flex-col items-center lg:flex-1 lg:flex-row">
            <div className={`w-full rounded-2xl border-2 p-5 text-center shadow-soft ${s.highlight ? 'border-olive-700 bg-olive-100' : 'border-olive-100 bg-white'}`}>
              <span className="mx-auto mb-2 grid size-12 place-items-center rounded-full bg-olive-700 text-white">
                <s.icon aria-hidden />
              </span>
              <p className="text-xs font-bold uppercase tracking-wide text-olive-600">{fmtNum(i + 1, lang)}</p>
              <h2 className="text-lg">{s.title}</h2>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </div>
            {i < steps.length - 1 && (
              <span aria-hidden className="py-2 text-3xl font-bold text-olive-500 lg:px-2 lg:py-0">
                <span className="lg:hidden">↓</span>
                <span className="hidden lg:inline">→</span>
              </span>
            )}
          </li>
        ))}
      </ol>

      <p role="note" className="mt-6 rounded-2xl border-2 border-mustard/60 bg-mustard-100 p-5 font-semibold text-ink">
        {t('how.note')}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>{t('how.coachTitle')}</CardTitle>
          <p className="text-muted">{t('how.coachText')}</p>
        </Card>
        <Card>
          <CardTitle className="flex items-center gap-2">
            <WifiOff size={20} className="text-olive-600" aria-hidden /> {t('how.offlineTitle')}
          </CardTitle>
          <p className="text-muted">{t('how.offlineText')}</p>
        </Card>
      </div>
    </div>
  )
}
