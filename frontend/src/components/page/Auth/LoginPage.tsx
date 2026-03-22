import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { getErrorMessage } from '../../../services/api'
import { PasswordInput } from '../../common/PasswordInput/PasswordInput'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    const errors: typeof fieldErrors = {}
    if (!username.trim()) errors.username = 'Username is required'
    if (!password.trim()) errors.password = 'Password is required'
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }

    setError('')
    setIsSubmitting(true)
    try {
      await login({ username, password })
      navigate('/chat', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-split">
      {/* Left branding panel */}
      <div className="auth-brand">
        <div className="auth-brand-glow" />
        <div className="auth-brand-content">
          <div className="auth-brand-logo">HA</div>
          <h1 className="auth-brand-name">Hotak AI</h1>
          <p className="auth-brand-tagline">
            Your intelligent knowledge assistant. Upload documents, ask questions, get instant answers.
          </p>
          <ul className="auth-brand-features">
            <li>📄 Upload PDFs, Docs &amp; URLs</li>
            <li>🧠 Template-based knowledge bases</li>
            <li>⚡ Real-time streaming responses</li>
          </ul>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <h2 className="auth-title">Sign in</h2>
          <p className="auth-subtitle">Welcome back to Hotak AI</p>

          <form className="auth-form" onSubmit={(e) => { e.preventDefault(); void handleSubmit() }}>
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                className={`form-input${fieldErrors.username ? ' has-error' : ''}`}
                type="text"
                value={username}
                placeholder="Enter your username"
                onChange={(e) => { setUsername(e.target.value); setFieldErrors((f) => ({ ...f, username: undefined })) }}
                autoComplete="username"
                autoFocus
              />
              {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <PasswordInput
                id="password"
                className={`form-input${fieldErrors.password ? ' has-error' : ''}`}
                value={password}
                placeholder="Enter your password"
                onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: undefined })) }}
                autoComplete="current-password"
              />
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>

            <button className="auth-submit-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
