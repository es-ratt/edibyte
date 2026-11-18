import { Database } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppStore, useT } from '@/app/store'
import { Button, Card, PageTitle } from '@/components/ui'
import { LANGS } from '@/lib/i18n'

// Phase 2 adds teen mode, pause tracking, hide numbers, notifications, delete-all and the wellbeing placeholder.
export default function Settings() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)
  const lowData = useAppStore((s) => s.lowData)
  const setLowData = useAppStore((s) => s.setLowData)

  return (
    <>
      <PageTitle>{t('route.settings')}</PageTitle>
      <div className="flex flex-col gap-4">
        <Card as="section" labelledBy="set-lang">
          <h2 id="set-lang" className="mb-3 font-semibold text-olive-900">
            {t('settings.language')}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {LANGS.map((l) => (
              <Button key={l} variant={lang === l ? 'primary' : 'secondary'} aria-pressed={lang === l} onClick={() => setLang(l)}>
                {t(`lang.${l}`)}
              </Button>
            ))}
          </div>
        </Card>

        <Card as="section">
          <label className="flex min-h-tap cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block font-semibold text-olive-900">{t('settings.lowData')}</span>
              <span className="block text-sm text-muted">{t('settings.lowDataHint')}</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={lowData}
              onChange={(e) => setLowData(e.target.checked)}
              className="size-6 shrink-0 accent-olive-700"
            />
          </label>
        </Card>

        <Link to="/data-sources" className="flex min-h-tap items-center gap-2 font-semibold text-olive-700 underline underline-offset-4">
          <Database size={18} aria-hidden />
          {t('settings.dataLink')}
        </Link>
      </div>
    </>
  )
}
