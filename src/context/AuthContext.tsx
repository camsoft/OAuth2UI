import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthUser, LoginRequest } from '../types/auth'
import * as authService from '../services/authService'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function getInitialState(): { token: string | null; user: AuthUser | null } {
  const storedToken = authService.getToken()

  if (!authService.isTokenValid(storedToken)) {
    return { token: null, user: null }
  }

  return { token: storedToken, user: authService.getUserFromToken(storedToken) }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ token, user }, setState] = useState(getInitialState)

  const handleLogin = useCallback(async (credentials: LoginRequest) => {
    const newToken = await authService.login(credentials)
    setState({ token: newToken, user: authService.getUserFromToken(newToken) })
  }, [])

  const handleLogout = useCallback(() => {
    authService.logout()
    setState({ token: null, user: null })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      login: handleLogin,
      logout: handleLogout,
    }),
    [user, token, handleLogin, handleLogout]
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
