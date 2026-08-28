import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './LoginForm.css'

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const { login } = useAuth()

  async function handleSignIn() {
    setError(null)
    setIsRedirecting(true)

    try {
      // Redirects the whole page to the Authorization Server's
      // /connect/authorize endpoint; the user signs in there and is sent
      // back to /callback with an authorization code.
      await login()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setIsRedirecting(false)
    }
  }

  return (
    <div className="login-form">
      <h2>Sign in</h2>

      <p className="login-form__hint">
        You&rsquo;ll be redirected to sign in, then sent back here automatically. Try{' '}
        <code>admin</code> / <code>Admin123!</code> or <code>member</code> / <code>Member123!</code>
      </p>

      {error && (
        <p className="login-form__error" role="alert">
          {error}
        </p>
      )}

      <button type="button" onClick={handleSignIn} disabled={isRedirecting}>
        {isRedirecting ? 'Redirecting…' : 'Sign in'}
      </button>
    </div>
  )
}

