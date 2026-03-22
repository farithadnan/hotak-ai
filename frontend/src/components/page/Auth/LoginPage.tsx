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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">HA</div>
        <h1 className="auth-title">Sign in to Hotak AI</h1>

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
            <label className="form-label" htmlFor="password">Password</label>
            <PasswordInput
              id="password"
              className={`form-input${fieldErrors.password ? ' has-error' : ''}`}
              value={password}
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
  )
}
