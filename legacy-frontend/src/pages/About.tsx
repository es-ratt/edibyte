import { ArrowRight, Database, Map, Scale, ShieldCheck, Users, Workflow } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { useApp } from '@/hooks/useApp'
import type { TKey } from '@/lib/i18n'

const PAGES: { to: string; title: TKey; text: TKey; icon: typeof Workflow }[] = [
  { to: '/how-it-works', title: 'about.how', text: 'about.howText', icon: Workflow },
  { to: '/data', title: 'about.data', text: 'about.dataText', icon: Database },
  { to: '/responsible-ai', title: 'about.rai', text: 'about.raiText', icon: ShieldCheck },
  { to: '/impact', title: 'about.impact', text: 'about.impactText', icon: Scale },
  { to: '/roadmap', title: 'about.roadmap', text: 'about.roadmapText', icon: Map },
  { to: '/team', title: 'about.team', text: 'about.teamText', icon: Users },
]

export default function About() {
  const { t } = useApp()
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t('about.title')} subtitle={t('about.subtitle')} />
      <ul className="grid gap-4 sm:grid-cols-2">
        {PAGES.map((p) => (
          <li key={p.to}>
            <Link to={p.to} className="group flex h-full items-start gap-4 rounded-2xl border border-olive-100 bg-white p-5 shadow-soft transition-colors hover:border-olive-500">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-olive-100 text-olive-700">
                <p.icon aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-lg font-bold text-olive-900">{t(p.title)}</span>
                <span className="block text-muted">{t(p.text)}</span>
              </span>
              <ArrowRight className="mt-1 text-olive-600 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
