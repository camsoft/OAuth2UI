import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import './CallbackPage.css'

/**
 * The redirect target for /connect/authorize (see VITE_OAUTH_REDIRECT_URI
 * and OAuthClients:Spa.RedirectUris on the API). Reads the `code`/`state`
 * (or `error`) query string params the Authorization Server appends to the
 * redirect, and exchanges the code for tokens.
 */
export function CallbackPage() {
  const [searchParams] = useSearchParams()
  const { completeLogin } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const hasRun = useRef(false)

  useEffect(() => {
    // Guard against React 18/19 StrictMode double-invoking effects in
    // development, which would otherwise try to redeem the same
    // authorization code twice (and fail the second time).
    if (hasRun.current) return
    hasRun.current = true

    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(searchParams.get('error_description') ?? errorParam)
      return
    }

    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      setError('The sign-in redirect was missing required parameters.')
      return
    }

    completeLogin(code, state)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch((err) => setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.'))
  }, [searchParams, completeLogin, navigate])

  return (
    <main className="callback-page">
      <Logo />

      {error ? (
        <>
          <p className="callback-page__error" role="alert">
            {error}
          </p>
          <a href="/">Back to sign in</a>
        </>
      ) : (
        <p>Signing you in&hellip;</p>
      )}
    </main>
  )
}
