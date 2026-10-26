import { Compass } from 'lucide-react'
import { ButtonLink } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { useApp } from '@/hooks/useApp'

export default function NotFound() {
  const { t } = useApp()
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState icon={<Compass aria-hidden />} title={t('notFound.title')} action={<ButtonLink to="/">{t('notFound.home')}</ButtonLink>} />
    </div>
  )
}
