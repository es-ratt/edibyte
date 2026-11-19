import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Database, Pencil, ShieldCheck, Trash2 } from 'lucide-react'
import { useAppStore, useMode, useT } from '@/app/store'
import { SwitchRow } from '@/components/form'
import { Button, Card, Chip, PageTitle } from '@/components/ui'
import { GuidanceCard } from '@/features/profile/GuidanceCard'
import { SupportCard, WellbeingCheckIn } from '@/features/safety/SafetyCards'
import { fmtNum, LANGS } from '@/lib/i18n'

export default function Settings() {
  const t = useT()
  const navigate = useNavigate()
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)
  const lowData = useAppStore((s) => s.lowData)
  const setLowData = useAppStore((s) => s.setLowData)
  const profile = useAppStore((s) => s.profile)
  const safety = useAppStore((s) => s.safety)
  const setSafety = useAppStore((s) => s.setSafety)
  const deleteAll = useAppStore((s) => s.deleteAll)
  const mode = useMode()
  const [confirming, setConfirming] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)

  const isMinor = mode.age !== null && mode.age < 18

  const handleDelete = async () => {
    const ok = await deleteAll()
    if (!ok) {
      setDeleteFailed(true)
      return
    }
    navigate('/welcome')
  }

  return (
    <>
      <PageTitle>{t('route.settings')}</PageTitle>
      <div className="flex flex-col gap-4">
        {profile && (
          <Card as="section" labelledBy="set-profile">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="set-profile" className="font-semibold text-olive-900">
                  {t('set.profile')}
                </h2>
                {/* Never show body-weight numbers here (teen safety). */}
                <p className="text-muted">
                  {t('set.ageYears', { n: fmtNum(mode.age ?? 0, lang) })} · {t(`goal.${profile.goal}`)} · {t(`diet.${profile.diet}`)}
                </p>
                {mode.teen && (
                  <span className="mt-2 inline-block">
                    <Chip icon={ShieldCheck} tone="olive">
                      {t('teen.chip')}
                    </Chip>
                  </span>
                )}
              </div>
              <Link to="/onboarding" className="inline-flex min-h-tap shrink-0 items-center gap-1 font-semibold text-olive-700 underline underline-offset-4">
                <Pencil size={16} aria-hidden />
                {t('set.editProfile')}
              </Link>
            </div>
          </Card>
        )}

        {profile && <GuidanceCard profile={profile} />}

        <Card as="section" labelledBy="set-safety">
          <h2 id="set-safety" className="mb-1 font-semibold text-olive-900">
            {t('set.safety')}
          </h2>
          <SwitchRow
            label={t('set.teenMode')}
            hint={t('set.teenModeHint')}
            checked={mode.teen}
            disabled={isMinor}
            onChange={(on) => setSafety({ adultTeenMode: on })}
          />
          <SwitchRow
            label={t('set.pause')}
            hint={t('set.pauseHint')}
            checked={safety.pauseTracking || safety.wellbeingFlagged}
            onChange={(on) => setSafety({ pauseTracking: on, ...(on ? {} : { wellbeingFlagged: false }) })}
          />
          <SwitchRow label={t('set.hideNumbers')} hint={t('set.hideNumbersHint')} checked={safety.hideNumbers} onChange={(on) => setSafety({ hideNumbers: on })} />
          <SwitchRow label={t('set.notifications')} hint={t('set.notificationsHint')} checked={safety.notifications} onChange={(on) => setSafety({ notifications: on })} />
          <SwitchRow label={t('set.shareUsage')} hint={t('set.shareUsageHint')} checked={safety.shareUsage} onChange={(on) => setSafety({ shareUsage: on })} />
        </Card>

        <WellbeingCheckIn />
        <SupportCard />

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
          <SwitchRow label={t('settings.lowData')} hint={t('settings.lowDataHint')} checked={lowData} onChange={setLowData} />
        </Card>

        <Card as="section" labelledBy="set-delete">
          <h2 id="set-delete" className="mb-1 font-semibold text-olive-900">
            {t('set.delete')}
          </h2>
          <p className="mb-3 text-sm text-muted">{t('set.deleteHint')}</p>
          {deleteFailed && (
            <p role="alert" className="mb-3 font-semibold">
              {t('set.deleteFailed')}
            </p>
          )}
          {confirming ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleDelete()}>
                <Trash2 size={18} aria-hidden />
                {t('set.deleteConfirm')}
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                {t('set.deleteCancel')}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setConfirming(true)}>
              <Trash2 size={18} aria-hidden />
              {t('set.delete')}
            </Button>
          )}
        </Card>

        <Link to="/data-sources" className="flex min-h-tap items-center gap-2 font-semibold text-olive-700 underline underline-offset-4">
          <Database size={18} aria-hidden />
          {t('settings.dataLink')}
        </Link>
      </div>
    </>
  )
}
