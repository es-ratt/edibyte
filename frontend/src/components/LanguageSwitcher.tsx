import { LANGS } from '@/lib/i18n'
import { useApp } from '@/hooks/useApp'

/** Two-way segmented control: বাংলা / English. */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useApp()
  return (
    <div role="group" aria-label={t('lang.label')} className="inline-flex rounded-xl border border-olive-200 bg-olive-50 p-0.5">
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          lang={l.id === 'bn' ? 'bn' : 'en'}
          aria-pressed={lang === l.id}
          onClick={() => setLang(l.id)}
          className={`min-h-11 rounded-[10px] px-2.5 text-sm font-semibold transition-colors sm:px-3 ${
            lang === l.id ? 'bg-olive-700 text-white shadow-soft' : 'text-olive-900 hover:bg-olive-100'
          }`}
        >
          {compact && l.id === 'en' ? 'EN' : l.label}
        </button>
      ))}
    </div>
  )
}
