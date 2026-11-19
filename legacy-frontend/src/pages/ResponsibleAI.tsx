import { AlertCircle, Lock, ShieldCheck, SlidersHorizontal, Sparkles } from 'lucide-react'
import { Card, CardTitle } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { useApp } from '@/hooks/useApp'
import type { TKey } from '@/lib/i18n'

const SECTIONS: { title: TKey; items: TKey[]; icon: typeof Lock }[] = [
  { title: 'rai.limitsTitle', items: ['rai.limits1', 'rai.limits2', 'rai.limits3'], icon: AlertCircle },
  { title: 'rai.privacyTitle', items: ['rai.privacy1', 'rai.privacy2', 'rai.privacy3'], icon: Lock },
  { title: 'rai.controlTitle', items: ['rai.control1', 'rai.control2'], icon: SlidersHorizontal },
  { title: 'rai.safetyTitle', items: ['rai.safety1', 'rai.safety2', 'rai.safety3'], icon: ShieldCheck },
  { title: 'rai.modeTitle', items: ['rai.modeText'], icon: Sparkles },
]

export default function ResponsibleAI() {
  const { t } = useApp()
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t('rai.title')} />
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <Card key={s.title}>
            <CardTitle className="flex items-center gap-2">
              <s.icon size={20} className="text-olive-600" aria-hidden /> {t(s.title)}
            </CardTitle>
            <ul className="list-disc space-y-2 pl-5 text-muted">
              {s.items.map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  )
}
