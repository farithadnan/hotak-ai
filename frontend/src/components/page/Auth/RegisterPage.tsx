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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">HA</div>
        <h1 className="auth-title">Create your account</h1>

        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); void handleSubmit() }}>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              className={`form-input${fieldErrors.username ? ' has-error' : ''}`}
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setFieldErrors((f) => ({ ...f, username: undefined })) }}
              autoComplete="username"
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
  )
}
