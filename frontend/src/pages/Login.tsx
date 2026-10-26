import { LogIn } from 'lucide-react'
import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader'
import { useApp } from '@/hooks/useApp'
import { useAuth } from '@/hooks/useAuth'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { t } = useApp()
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const nameId = useId()
  const emailId = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<'name' | 'email' | null>(null)

  const submit = () => {
    if (!name.trim()) return setError('name')
    if (!EMAIL.test(email.trim())) return setError('email')
    login({ name: name.trim().slice(0, 60), email: email.trim().slice(0, 120) })
    navigate('/')
  }

  const field =
    'min-h-11 w-full rounded-xl border border-olive-100 bg-white px-3 py-2.5 outline-none focus:border-olive-500'

  if (user) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title={t('auth.hello', { name: user.name })} subtitle={user.email} />
        <Button variant="outline" onClick={logout}>
          {t('auth.logout')}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={t('auth.title')} subtitle={t('auth.subtitle')} />
      <form
        className="space-y-4 rounded-2xl border border-olive-100 bg-white p-5 shadow-soft"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div>
          <label htmlFor={nameId} className="mb-1 block font-semibold">
            {t('auth.name')}
          </label>
          <input id={nameId} className={field} value={name} maxLength={60} autoComplete="name" onChange={(e) => setName(e.target.value)} />
          {error === 'name' && <p role="alert" className="mt-1 text-sm text-red-700">{t('auth.nameRequired')}</p>}
        </div>
        <div>
          <label htmlFor={emailId} className="mb-1 block font-semibold">
            {t('auth.email')}
          </label>
          <input id={emailId} className={field} type="email" value={email} maxLength={120} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
          {error === 'email' && <p role="alert" className="mt-1 text-sm text-red-700">{t('auth.emailInvalid')}</p>}
        </div>
        <Button type="submit" className="w-full" icon={<LogIn size={18} aria-hidden />}>
          {t('auth.submit')}
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => navigate('/')}>
          {t('auth.guest')}
        </Button>
        <p className="text-sm text-muted">{t('auth.note')}</p>
      </form>
    </div>
  )
}
