import { UserRound } from 'lucide-react'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { useApp } from '@/hooks/useApp'
import { TEAM } from '@/lib/team'

export default function Team() {
  const { t } = useApp()
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t('team.title')} subtitle={t('team.subtitle')} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEAM.map((m) => (
          <li key={m.role}>
            <Card className="h-full">
              <span className="mb-3 grid size-14 place-items-center rounded-full bg-olive-100 text-olive-700">
                <UserRound size={28} aria-hidden />
              </span>
              <p className={`text-lg font-bold ${m.name ? 'text-olive-900' : 'italic text-muted'}`}>{m.name || t('team.namePlaceholder')}</p>
              <p className="font-semibold text-olive-700">{t(m.role)}</p>
              <p className="mt-2 text-muted">{t(m.description)}</p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
