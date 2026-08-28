import { useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import './DashboardPage.css'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    void logout().then(() => navigate('/'))
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-page__header">
        <Logo size="small" />
        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <section className="dashboard-page__content">
        <h1>Welcome, {user?.username}!</h1>
        <p>
          You are signed in as <strong>{user?.role ?? 'Unknown role'}</strong>. Your access token was issued by
          the OAuth 2.0 Authorization Server via the Authorization Code + PKCE flow, is stored in session
          storage, and is sent as a <code>Bearer</code> token on future API calls.
        </p>
      </section>
    </main>
  )
}
