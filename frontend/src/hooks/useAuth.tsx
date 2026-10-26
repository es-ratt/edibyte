// Demo login. NO password and NO server: the name/email are kept only in this browser
// (localStorage) so the app can show who is "signed in". Real accounts need a backend
// or an auth service such as Firebase / Supabase Auth.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { load, save } from '@/lib/storage'

export interface AuthUser {
  name: string
  email: string
}

interface AuthState {
  user: AuthUser | null
  login: (u: AuthUser) => void
  logout: () => void
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => load<AuthUser | null>('user', null))

  const login = useCallback((u: AuthUser) => {
    setUser(u)
    save('user', u)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    save('user', null)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}
