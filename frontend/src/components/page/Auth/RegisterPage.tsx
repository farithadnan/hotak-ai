import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { getErrorMessage } from '../../../services/api'
import { PasswordInput } from '../../common/PasswordInput/PasswordInput'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; email?: string; password?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    const errors: typeof fieldErrors = {}
    if (!username.trim()) errors.username = 'Username is required'
    if (!email.trim()) errors.email = 'Email is required'
    if (!password.trim()) errors.password = 'Password is required'
    else if (password.length < 6) errors.password = 'Minimum 6 characters'
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }

    setError('')
    setIsSubmitting(true)
    try {
      await register({ username, email, password })
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
          <div className="auth-brand-logo"><img src="/src/assets/hotak-ai-logo.webp" alt="Hotak AI" /></div>
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
          <h2 className="auth-title">Create account</h2>
          <p className="auth-subtitle">Get started with Hotak AI</p>

          <form className="auth-form" onSubmit={(e) => { e.preventDefault(); void handleSubmit() }}>
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                className={`form-input${fieldErrors.username ? ' has-error' : ''}`}
                type="text"
                value={username}
                placeholder="Choose a username"
                onChange={(e) => { setUsername(e.target.value); setFieldErrors((f) => ({ ...f, username: undefined })) }}
                autoComplete="username"
                autoFocus
              />
              {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                className={`form-input${fieldErrors.email ? ' has-error' : ''}`}
                type="email"
                value={email}
                placeholder="Enter your email"
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: undefined })) }}
                autoComplete="email"
              />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <PasswordInput
                id="password"
                className={`form-input${fieldErrors.password ? ' has-error' : ''}`}
                value={password}
                placeholder="Minimum 6 characters"
                onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: undefined })) }}
                autoComplete="new-password"
              />
              {fieldErrors.password
                ? <span className="field-error">{fieldErrors.password}</span>
                : <span className="form-hint">Minimum 6 characters</span>}
            </div>

            <button className="auth-submit-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
