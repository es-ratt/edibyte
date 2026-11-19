import { BarChart3, CheckCircle2, Database, Languages, PenLine, Salad } from 'lucide-react'
import { Button, ButtonLink } from '@/components/Button'
import { Card } from '@/components/Card'
import { useApp } from '@/hooks/useApp'
import { useTryDemo } from '@/hooks/useTryDemo'
import { fmtNum } from '@/lib/i18n'

export default function Home() {
  const { t, lang } = useApp()
  const tryDemo = useTryDemo()

  const steps = [
    { icon: PenLine, title: t('home.step1Title'), text: t('home.step1Text') },
    { icon: CheckCircle2, title: t('home.step2Title'), text: t('home.step2Text') },
    { icon: BarChart3, title: t('home.step3Title'), text: t('home.step3Text') },
  ]
  const benefits = [
    { icon: Salad, title: t('home.b1Title'), text: t('home.b1Text') },
    { icon: Database, title: t('home.b2Title'), text: t('home.b2Text') },
    { icon: Languages, title: t('home.b3Title'), text: t('home.b3Text') },
  ]

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="grid items-center gap-8 pt-2 md:grid-cols-[1.2fr_1fr]">
        <div>
          <span className="inline-flex rounded-full bg-olive-100 px-3 py-1 text-sm font-semibold text-olive-900">{t('home.badge')}</span>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl">{t('home.title')}</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">{t('home.subtitle')}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button onClick={tryDemo} className="px-6 text-lg">
              {t('nav.tryDemo')}
            </Button>
            <ButtonLink to="/log" variant="outline" className="px-6 text-lg">
              {t('home.logFirst')}
            </ButtonLink>
          </div>
        </div>
        {/* Illustrative sample of the flow, built from text so it stays light on slow connections */}
        <Card className="bg-olive-50" aria-hidden="true">
          <div className="rounded-xl bg-white p-4 text-ink shadow-soft" lang="bn">
            “এক প্লেট ভাত, ডাল আর ডিম”
          </div>
          <div className="my-3 text-center text-2xl text-olive-500">↓</div>
          <ul className="space-y-2">
            {['ভাত · ১ প্লেট', 'ডাল · ১ বাটি', 'ডিম · ১টি'].map((x) => (
              <li key={x} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-soft" lang="bn">
                <CheckCircle2 size={18} className="text-olive-600" /> {x}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-xs text-muted">{t('badge.demo')} · {t('badge.unverified')}</p>
        </Card>
      </section>

      {/* 3 steps */}
      <section aria-labelledby="steps">
        <h2 id="steps" className="mb-5 text-2xl">{t('home.stepsTitle')}</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full">
                <div className="mb-3 flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-olive-700 font-bold text-white">{fmtNum(i + 1, lang)}</span>
                  <s.icon className="text-olive-600" aria-hidden />
                </div>
                <h3 className="text-lg">{s.title}</h3>
                <p className="mt-1 text-muted">{s.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* Benefits */}
      <section aria-labelledby="benefits">
        <h2 id="benefits" className="mb-5 text-2xl">{t('home.benefitsTitle')}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {benefits.map((b) => (
            <Card key={b.title} className="h-full">
              <span className="mb-3 grid size-11 place-items-center rounded-xl bg-olive-100 text-olive-700">
                <b.icon aria-hidden />
              </span>
              <h3 className="text-lg">{b.title}</h3>
              <p className="mt-1 text-muted">{b.text}</p>
            </Card>
          ))}
        </div>
        <p className="mt-5 text-sm text-muted">{t('home.dataNote')}</p>
      </section>
    </div>
  )
}
