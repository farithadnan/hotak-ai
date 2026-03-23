import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { getAvailableModels } from '../../../services/models'
import type { Model } from '../../../types'
import type { AccentColor, ChatBackground, ThemeMode } from '../../../types/auth'
import { Modal } from '../../common/Modal/Modal'
import { FormField } from '../../common/FormField/FormField'
import { PasswordInput } from '../../common/PasswordInput/PasswordInput'
import { ACCENT_LABELS, ACCENT_SWATCHES } from '../../../utils/theme'
import style from './UserSettingsModal.module.css'

interface UserSettingsModalProps {
  open: boolean
  onClose: () => void
}

type Tab = 'account' | 'security' | 'preferences' | 'appearance'

const CHAT_BG_OPTIONS: { value: ChatBackground; label: string; preview: string }[] = [
  { value: 'none',            label: 'None',          preview: 'transparent' },
  { value: 'dots',            label: 'Dots',          preview: 'dots' },
  { value: 'grid',            label: 'Grid',          preview: 'grid' },
  { value: 'gradient-warm',   label: 'Warm',          preview: 'gradient-warm' },
  { value: 'gradient-cool',   label: 'Cool',          preview: 'gradient-cool' },
  { value: 'gradient-purple', label: 'Purple',        preview: 'gradient-purple' },
]

export function UserSettingsModal({ open, onClose }: UserSettingsModalProps) {
  const { user, updateUser, changePassword, updatePreferences } = useAuth()
  const [tab, setTab] = useState<Tab>('account')

  // --- Account tab ---
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [accountErrors, setAccountErrors] = useState<{ username?: string; email?: string }>({})
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountError, setAccountError] = useState('')
  const [accountSaved, setAccountSaved] = useState(false)

  // --- Security tab ---
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwErrors, setPwErrors] = useState<{ current?: string; new?: string; confirm?: string }>({})
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  // --- Preferences tab ---
  const [models, setModels] = useState<Model[]>([])
  const [defaultModel, setDefaultModel] = useState<string>('')
  const [defaultPrompt, setDefaultPrompt] = useState('')
  const [prefSaving, setPrefSaving] = useState(false)
  const [prefSaved, setPrefSaved] = useState(false)

  // --- Appearance tab ---
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [accent, setAccent] = useState<AccentColor>('indigo')
  const [chatBg, setChatBg] = useState<ChatBackground>('none')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [appearanceSaving, setAppearanceSaving] = useState(false)
  const [appearanceSaved, setAppearanceSaved] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Reset on open
  useEffect(() => {
    if (!open) return
    setTab('account')
    setAccountError('')
    setAccountSaved(false)
    setPwError('')
    setPwSaved(false)
    setPrefSaved(false)
    setAppearanceSaved(false)

    const prefs = user?.preferences
    setUsername(user?.username ?? '')
    setEmail(user?.email ?? '')
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setPwErrors({})
    setAccountErrors({})
    setDefaultModel(prefs?.default_model ?? '')
    setDefaultPrompt(prefs?.default_system_prompt ?? '')
    setTheme(prefs?.theme ?? 'dark')
    setAccent(prefs?.accent ?? 'indigo')
    setChatBg(prefs?.chat_background ?? 'none')
    setAvatar(prefs?.avatar ?? null)

    void getAvailableModels().then(setModels).catch(() => setModels([]))
  }, [open, user])

  // --- Account save ---
  const handleSaveAccount = async () => {
    const fe: typeof accountErrors = {}
    if (!username.trim()) fe.username = 'Username is required'
    if (!email.trim()) fe.email = 'Email is required'
    if (Object.keys(fe).length > 0) { setAccountErrors(fe); return }

    setAccountError('')
    setAccountSaving(true)
    try {
      await updateUser({ username: username.trim(), email: email.trim() })
      setAccountSaved(true)
      setTimeout(() => setAccountSaved(false), 3000)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setAccountError(detail ?? 'Failed to save.')
    } finally {
      setAccountSaving(false)
    }
  }

  // --- Password save ---
  const handleSavePassword = async () => {
    const fe: typeof pwErrors = {}
    if (!currentPw) fe.current = 'Current password is required'
    if (!newPw) fe.new = 'New password is required'
    else if (newPw.length < 6) fe.new = 'Minimum 6 characters'
    if (newPw && confirmPw !== newPw) fe.confirm = 'Passwords do not match'
    if (Object.keys(fe).length > 0) { setPwErrors(fe); return }

    setPwError('')
    setPwSaving(true)
    try {
      await changePassword({ current_password: currentPw, new_password: newPw })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setPwSaved(true)
      setTimeout(() => setPwSaved(false), 3000)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setPwError(detail ?? 'Failed to change password.')
    } finally {
      setPwSaving(false)
    }
  }

  // --- Preferences save ---
  const handleSavePreferences = async () => {
    setPrefSaving(true)
    try {
      await updatePreferences({
        default_model: defaultModel || null,
        default_system_prompt: defaultPrompt || null,
      })
      setPrefSaved(true)
      setTimeout(() => setPrefSaved(false), 3000)
    } finally {
      setPrefSaving(false)
    }
  }

  // --- Appearance save ---
  const handleSaveAppearance = async () => {
    setAppearanceSaving(true)
    try {
      await updatePreferences({ theme, accent, chat_background: chatBg, avatar })
      setAppearanceSaved(true)
      setTimeout(() => setAppearanceSaved(false), 3000)
    } finally {
      setAppearanceSaving(false)
    }
  }

  // --- Avatar ---
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Resize via canvas to max 200x200
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = Math.min(img.width, img.height)
        canvas.width = 200; canvas.height = 200
        const ctx = canvas.getContext('2d')!
        const offsetX = (img.width - size) / 2
        const offsetY = (img.height - size) / 2
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 200, 200)
        setAvatar(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const ACCENT_KEYS = Object.keys(ACCENT_LABELS) as AccentColor[]

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className={style.root}>
        <div className="form-tabs">
          <button type="button" className={tab === 'account'     ? 'form-tab is-active' : 'form-tab'} onClick={() => setTab('account')}>Account</button>
          <button type="button" className={tab === 'security'    ? 'form-tab is-active' : 'form-tab'} onClick={() => setTab('security')}>Security</button>
          <button type="button" className={tab === 'preferences' ? 'form-tab is-active' : 'form-tab'} onClick={() => setTab('preferences')}>Preferences</button>
          <button type="button" className={tab === 'appearance'  ? 'form-tab is-active' : 'form-tab'} onClick={() => setTab('appearance')}>Appearance</button>
        </div>

        <div className="form-tab-panel">

          {/* ---- Account ---- */}
          {tab === 'account' && (
            <form onSubmit={(e) => { e.preventDefault(); void handleSaveAccount() }}>
              {/* Avatar */}
              <div className={style.avatarRow}>
                <div className={style.avatarPreview} onClick={() => avatarInputRef.current?.click()}>
                  {avatar
                    ? <img src={avatar} alt="avatar" className={style.avatarImg} />
                    : <span className={style.avatarInitial}>{user?.username?.[0]?.toUpperCase() ?? 'U'}</span>
                  }
                  <div className={style.avatarOverlay}>Change</div>
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
                <div className={style.avatarHint}>
                  <p className="form-hint">Click to upload a profile picture.</p>
                  {avatar && (
                    <button type="button" className={style.removeAvatarBtn} onClick={() => setAvatar(null)}>
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              {accountError && <div className="form-error">{accountError}</div>}
              {accountSaved && <div className="form-success">Profile saved.</div>}

              <FormField label="Username" htmlFor="us-username" error={accountErrors.username} required>
                <input
                  id="us-username"
                  className={`form-input${accountErrors.username ? ' has-error' : ''}`}
                  value={username}
                  placeholder="Username"
                  onChange={(e) => { setUsername(e.target.value); setAccountErrors((f) => ({ ...f, username: undefined })) }}
                />
              </FormField>
              <FormField label="Email" htmlFor="us-email" error={accountErrors.email} required>
                <input
                  id="us-email"
                  type="email"
                  className={`form-input${accountErrors.email ? ' has-error' : ''}`}
                  value={email}
                  placeholder="Email address"
                  onChange={(e) => { setEmail(e.target.value); setAccountErrors((f) => ({ ...f, email: undefined })) }}
                />
              </FormField>
              <button type="submit" className="form-submit" disabled={accountSaving}>
                {accountSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          )}

          {/* ---- Security ---- */}
          {tab === 'security' && (
            <form onSubmit={(e) => { e.preventDefault(); void handleSavePassword() }}>
              {pwError && <div className="form-error">{pwError}</div>}
              {pwSaved && <div className="form-success">Password changed successfully.</div>}
              <FormField label="Current Password" htmlFor="us-current-pw" error={pwErrors.current}>
                <PasswordInput
                  id="us-current-pw"
                  className={`form-input${pwErrors.current ? ' has-error' : ''}`}
                  value={currentPw}
                  placeholder="Current password"
                  onChange={(e) => { setCurrentPw(e.target.value); setPwErrors((f) => ({ ...f, current: undefined })) }}
                  autoFocus
                />
              </FormField>
              <FormField label="New Password" htmlFor="us-new-pw" error={pwErrors.new}>
                <PasswordInput
                  id="us-new-pw"
                  className={`form-input${pwErrors.new ? ' has-error' : ''}`}
                  value={newPw}
                  placeholder="Minimum 6 characters"
                  onChange={(e) => { setNewPw(e.target.value); setPwErrors((f) => ({ ...f, new: undefined })) }}
                />
              </FormField>
              <FormField label="Confirm New Password" htmlFor="us-confirm-pw" error={pwErrors.confirm}>
                <PasswordInput
                  id="us-confirm-pw"
                  className={`form-input${pwErrors.confirm ? ' has-error' : ''}`}
                  value={confirmPw}
                  placeholder="Re-enter new password"
                  onChange={(e) => { setConfirmPw(e.target.value); setPwErrors((f) => ({ ...f, confirm: undefined })) }}
                />
              </FormField>
              <button type="submit" className="form-submit" disabled={pwSaving}>
                {pwSaving ? 'Changing…' : 'Change Password'}
              </button>
            </form>
          )}

          {/* ---- Preferences ---- */}
          {tab === 'preferences' && (
            <form onSubmit={(e) => { e.preventDefault(); void handleSavePreferences() }}>
              {prefSaved && <div className="form-success">Preferences saved.</div>}
              <FormField label="Default Model" htmlFor="us-model" hint="Applied to new chats when no template is selected.">
                <select
                  id="us-model"
                  className="form-select"
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                >
                  <option value="">System default</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Default System Prompt" htmlFor="us-prompt" hint="Prepended to every chat unless a template overrides it.">
                <textarea
                  id="us-prompt"
                  className="form-textarea"
                  value={defaultPrompt}
                  placeholder="Custom instructions for the AI (optional)"
                  rows={4}
                  onChange={(e) => setDefaultPrompt(e.target.value)}
                />
              </FormField>
              <button type="submit" className="form-submit" disabled={prefSaving}>
                {prefSaving ? 'Saving…' : 'Save Preferences'}
              </button>
            </form>
          )}

          {/* ---- Appearance ---- */}
          {tab === 'appearance' && (
            <form onSubmit={(e) => { e.preventDefault(); void handleSaveAppearance() }}>
              {appearanceSaved && <div className="form-success">Appearance saved.</div>}

              {/* Theme toggle */}
              <div className="form-group">
                <span className="form-label" style={{ display: 'block' }}>Theme</span>
                <div className={style.toggleRow}>
                  {(['dark', 'light'] as ThemeMode[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`${style.themeBtn}${theme === t ? ` ${style.themeBtnActive}` : ''}`}
                      onClick={() => setTheme(t)}
                    >
                      {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent palette */}
              <div className="form-group">
                <span className="form-label" style={{ display: 'block' }}>Accent Color</span>
                <div className={style.accentGrid}>
                  {ACCENT_KEYS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      className={`${style.accentSwatch}${accent === a ? ` ${style.accentSwatchActive}` : ''}`}
                      style={{ '--swatch-color': ACCENT_SWATCHES[a] } as React.CSSProperties}
                      onClick={() => setAccent(a)}
                      title={ACCENT_LABELS[a]}
                    >
                      <span className={style.accentDot} />
                      <span className={style.accentLabel}>{ACCENT_LABELS[a]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat background */}
              <div className="form-group">
                <span className="form-label" style={{ display: 'block' }}>Chat Background</span>
                <div className={style.bgGrid}>
                  {CHAT_BG_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${style.bgSwatch}${chatBg === opt.value ? ` ${style.bgSwatchActive}` : ''} chat-bg-${opt.value}`}
                      onClick={() => setChatBg(opt.value)}
                      title={opt.label}
                    >
                      <span className={style.bgLabel}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="form-submit" disabled={appearanceSaving}>
                {appearanceSaving ? 'Saving…' : 'Save Appearance'}
              </button>
            </form>
          )}
        </div>
      </div>
    </Modal>
  )
}
