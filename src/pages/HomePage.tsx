import { Navigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { LoginForm } from '../components/LoginForm'
import { useAuth } from '../context/AuthContext'
import './HomePage.css'

export function HomePage() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="home-page">
      <div className="home-page__intro">
        <Logo />
        <h1>Code Pro Training</h1>
        <p>Learn how to secure a Web API with OAuth 2.0 (Authorization Code + PKCE) and consume it from React.</p>
      </div>

      <LoginForm />
    </main>
  )
}
