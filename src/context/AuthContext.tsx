import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthUser } from '../types/auth'
import * as authService from '../services/authService'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  /** Redirects the browser to the Authorization Server's /connect/authorize endpoint. */
  login: () => Promise<void>
  /** Completes the flow after the /callback redirect by exchanging the code for tokens. */
  completeLogin: (code: string, state: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function getInitialUser(): AuthUser | null {
  return authService.isAccessTokenValid() ? authService.getCurrentUser() : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getInitialUser)

  const handleLogin = useCallback(async () => {
    await authService.redirectToAuthorize()
  }, [])

  const handleCompleteLogin = useCallback(async (code: string, state: string) => {
    const newUser = await authService.exchangeCodeForTokens(code, state)
    setUser(newUser)
  }, [])

  const handleLogout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login: handleLogin,
      completeLogin: handleCompleteLogin,
      logout: handleLogout,
    }),
    [user, handleLogin, handleCompleteLogin, handleLogout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Convenience hook for reading/using auth state from any component. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

