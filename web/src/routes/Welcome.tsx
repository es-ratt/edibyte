import { Camera, Leaf, ShieldCheck, Smartphone, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore, useT } from '@/app/store'
import { Button, Card } from '@/components/ui'
import { LANGS, type TKey } from '@/lib/i18n'

const POINTS: { icon: LucideIcon; key: TKey }[] = [
  { icon: Leaf, key: 'welcome.point1' },
  { icon: Smartphone, key: 'welcome.point2' },
  { icon: ShieldCheck, key: 'welcome.point3' },
]

export default function Welcome() {
  const t = useT()
  const navigate = useNavigate()
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)
  const setWelcomed = useAppStore((s) => s.setWelcomed)

  const handleStart = () => {
    setWelcomed()
    navigate('/onboarding')
  }

  return (
    <div className="flex flex-col gap-5 pt-4">
      <div className="grid size-16 place-items-center rounded-card bg-olive-700 text-white">
        <Camera size={30} aria-hidden />
      </div>
      <div>
        <h1 className="text-3xl font-semibold leading-tight text-olive-900">{t('welcome.title')}</h1>
        <p className="mt-2 text-lg text-ink">{t('app.tagline')}</p>
        <p className="mt-2 text-muted">{t('welcome.body')}</p>
      </div>

      <ul className="flex flex-col gap-3">
        {POINTS.map(({ icon: Icon, key }) => (
          <li key={key} className="flex items-start gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-olive-50 text-olive-700">
              <Icon size={18} aria-hidden />
            </span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>

      <Card as="section" labelledBy="choose-lang">
        <h2 id="choose-lang" className="mb-3 font-semibold text-olive-900">
          {t('welcome.chooseLang')}
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map((l) => (
            <Button key={l} variant={lang === l ? 'primary' : 'secondary'} aria-pressed={lang === l} onClick={() => setLang(l)}>
              {t(`lang.${l}`)}
            </Button>
          ))}
        </div>
      </Card>

      <Button block onClick={handleStart}>
        {t('welcome.start')}
      </Button>
      <p className="text-center text-sm text-muted">{t('welcome.note')}</p>
    </div>
  )
}
