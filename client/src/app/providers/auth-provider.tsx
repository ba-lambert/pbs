import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react'
import { clearAuth, readAuth, saveAuth } from '../../shared/lib/auth-storage'
import type { AuthSession } from '../../shared/types/auth'

interface AuthContextValue {
  session: AuthSession | null
  role: string | null
  isAuthenticated: boolean
  setSession: (session: AuthSession) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSessionState] = useState<AuthSession | null>(() => readAuth())

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      role: session?.role ?? null,
      isAuthenticated: Boolean(session?.accessToken),
      setSession: (nextSession) => {
        saveAuth(nextSession.accessToken, nextSession.role)
        setSessionState(nextSession)
      },
      logout: () => {
        clearAuth()
        setSessionState(null)
      },
    }),
    [session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
