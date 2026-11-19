import { Hammer } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useT } from '@/app/store'
import { Card, PageTitle } from '@/components/ui'
import type { TKey } from '@/lib/i18n'

type Props = { titleKey: TKey }

/** Shell for screens built in later phases. Real content replaces it phase by phase. */
export function Placeholder({ titleKey }: Props) {
  const t = useT()
  return (
    <>
      <PageTitle>{t(titleKey)}</PageTitle>
      <Card className="flex flex-col items-start gap-3">
        <Hammer size={22} aria-hidden className="text-olive-700" />
        <p className="text-muted">{t('common.soon')}</p>
        <Link to="/" className="inline-flex min-h-tap items-center font-semibold text-olive-700 underline underline-offset-4">
          {t('common.goHome')}
        </Link>
      </Card>
    </>
  )
}
