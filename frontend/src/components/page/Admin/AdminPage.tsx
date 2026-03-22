import { useEffect, useRef, useState } from 'react'
import { Lock, Pencil, Plus, Search, Settings, Trash2, Unlock } from '../../../icons'
import { PasswordInput } from '../../common/PasswordInput/PasswordInput'
import { Modal } from '../../common/Modal/Modal'
import { ConfirmDialog } from '../../common/ConfirmDialog/ConfirmDialog'
import { useAuth } from '../../../contexts/AuthContext'
import {
  createUser,
  deleteUser,
  getModelSettings,
  getSystemSettings,
  listUsers,
  lockUser,
  resetUserPassword,
  unlockUser,
  updateModelSettings,
  updateSystemSettings,
  updateUser,
  type AdminUserCreate,
  type ModelSettings,
  type SystemSettings,
} from '../../../services/admin'
import type { AuthUser } from '../../../types/auth'
import styles from './AdminPage.module.css'

type Tab = 'users' | 'models'

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function UsersTableSkeleton() {
  return (
    <table className={styles.table} aria-hidden="true">
      <thead>
        <tr>
          <th className={styles.th}>Username</th>
          <th className={styles.th}>Email</th>
          <th className={styles.th}>Role</th>
          <th className={styles.th}>Status</th>
          <th className={styles.th}></th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 4 }, (_, i) => (
          <tr key={i} className={styles.tr}>
            <td className={styles.td}><span className={`skeleton-box ${styles.skeletonCell}`} style={{ width: '80px' }} /></td>
            <td className={styles.td}><span className={`skeleton-box ${styles.skeletonCell}`} style={{ width: '140px' }} /></td>
            <td className={styles.td}><span className={`skeleton-box ${styles.skeletonCell}`} style={{ width: '44px' }} /></td>
            <td className={styles.td}><span className={`skeleton-box ${styles.skeletonCell}`} style={{ width: '52px' }} /></td>
            <td className={styles.td}></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ModelListSkeleton() {
  return (
    <div className={styles.modelList} aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={`${styles.modelRow} ${styles.skeletonRow}`}>
          <span className={`skeleton-box ${styles.skeletonCell}`} style={{ width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0 }} />
          <span className={`skeleton-box ${styles.skeletonCell}`} style={{ width: `${60 + i * 15}px` }} />
        </div>
      ))}
    </div>
  )
}

function SystemSettingsSkeleton() {
  return (
    <div className={styles.systemGrid} aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="form-group">
          <span className={`skeleton-box ${styles.skeletonCell}`} style={{ width: '100px', height: '11px' }} />
          <span className={`skeleton-box ${styles.skeletonCell}`} style={{ width: '100%', height: '34px', borderRadius: '8px' }} />
        </div>
      ))}
    </div>
  )
}

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')
  const [isSystemOpen, setIsSystemOpen] = useState(false)

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>Admin Panel</h2>
        <button className={styles.systemBtn} onClick={() => setIsSystemOpen(true)}>
          <Settings size={14} /> System Settings
        </button>
      </div>

      <div className="form-tabs">
        <button className={tab === 'users'  ? 'form-tab is-active' : 'form-tab'} onClick={() => setTab('users')}>Users</button>
        <button className={tab === 'models' ? 'form-tab is-active' : 'form-tab'} onClick={() => setTab('models')}>Models</button>
      </div>

      <div className="form-tab-panel">
        {tab === 'users'  && <UsersTab />}
        {tab === 'models' && <ModelsTab />}
      </div>

      <SystemSettingsModal open={isSystemOpen} onClose={() => setIsSystemOpen(false)} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------

function UsersTab() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pendingDeleteName, setPendingDeleteName] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    listUsers().then(setUsers).finally(() => setLoading(false))
  }, [])

  const canActOn = (u: AuthUser) => u.id !== currentUser?.id && u.role !== 'admin'

  const handleLock = async (userId: string) => {
    const updated = await lockUser(userId)
    setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
  }

  const handleUnlock = async (userId: string) => {
    const updated = await unlockUser(userId)
    setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
  }

  const handleRequestDelete = (userId: string, username: string) => {
    setPendingDeleteId(userId)
    setPendingDeleteName(username)
  }

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return
    const id = pendingDeleteId
    setPendingDeleteId(null)
    await deleteUser(id)
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  const handleCancelDelete = () => {
    setPendingDeleteId(null)
    setPendingDeleteName('')
  }

  const filtered = search.trim()
    ? users.filter((u) =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users

  const countLabel = search.trim()
    ? `${filtered.length} of ${users.length} users`
    : `${users.length} user${users.length !== 1 ? 's' : ''}`

  return (
    <div className={styles.tabContent}>
      <div className={styles.tabToolbar}>
        <span className="form-hint">{countLabel}</span>
        <div className={styles.toolbarGroup}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <Search size={12} style={{ position: 'absolute', left: '7px', color: 'var(--color-muted)', pointerEvents: 'none' }} />
            <input
              className={styles.searchInput}
              style={{ paddingLeft: '24px' }}
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className={styles.addBtn} onClick={() => setIsCreateOpen(true)}>
            <Plus size={13} /> New User
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.tableWrap}>
          <UsersTableSkeleton />
        </div>
      ) : (
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Username</th>
              <th className={styles.th}>Email</th>
              <th className={styles.th}>Role</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.td} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                  No users match your search.
                </td>
              </tr>
            )}
            {filtered.map((u) => (
              <tr key={u.id} className={styles.tr}>
                <td className={styles.td}>{u.username}</td>
                <td className={`${styles.td} ${styles.muted}`}>{u.email}</td>
                <td className={styles.td}>
                  <span className={u.role === 'admin' ? styles.badgeAdmin : styles.badgeUser}>{u.role}</span>
                </td>
                <td className={styles.td}>
                  <span className={u.is_active ? styles.badgeActive : styles.badgeLocked}>
                    {u.is_active ? 'Active' : 'Locked'}
                  </span>
                </td>
                <td className={styles.td}>
                  {canActOn(u) && (
                    <div className={styles.actions}>
                      <button className={styles.actionBtn} title="Edit" onClick={() => setEditingUser(u)}>
                        <Pencil size={13} />
                      </button>
                      {u.is_active
                        ? <button className={styles.actionBtn} title="Lock"   onClick={() => void handleLock(u.id)}><Lock size={13} /></button>
                        : <button className={styles.actionBtn} title="Unlock" onClick={() => void handleUnlock(u.id)}><Unlock size={13} /></button>
                      }
                      <button className={`${styles.actionBtn} ${styles.danger}`} title="Delete" onClick={() => handleRequestDelete(u.id, u.username)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      <CreateUserModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(user) => setUsers((prev) => [...prev, user])}
      />

      {editingUser && (
        <EditUserModal
          open={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          user={editingUser}
          onUpdated={(updated) => {
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
            setEditingUser(null)
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Delete User"
        message={`Permanently delete "${pendingDeleteName}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create user modal
// ---------------------------------------------------------------------------

function CreateUserModal({ open, onClose, onCreated }: {
  open: boolean
  onClose: () => void
  onCreated: (user: AuthUser) => void
}) {
  const [form, setForm] = useState<AdminUserCreate>({ username: '', email: '', password: '', role: 'user' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; email?: string; password?: string }>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setForm({ username: '', email: '', password: '', role: 'user' })
      setError('')
      setFieldErrors({})
    }
  }, [open])

  const handleSubmit = async () => {
    const fe: typeof fieldErrors = {}
    if (!form.username.trim()) fe.username = 'Username is required'
    if (!form.email.trim()) fe.email = 'Email is required'
    if (!form.password.trim()) fe.password = 'Password is required'
    if (Object.keys(fe).length > 0) { setFieldErrors(fe); return }

    setError('')
    setSaving(true)
    try {
      const user = await createUser(form)
      onCreated(user)
      onClose()
      setForm({ username: '', email: '', password: '', role: 'user' })
      setFieldErrors({})
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? 'Failed to create user.')
    } finally {
      setSaving(false)
    }
  }

  const clearField = (field: keyof typeof fieldErrors) =>
    setFieldErrors((f) => ({ ...f, [field]: undefined }))

  return (
    <Modal open={open} onClose={onClose} title="New User">
      <div className={styles.modalForm}>
        <form onSubmit={(e) => { e.preventDefault(); void handleSubmit() }}>
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className={`form-input${fieldErrors.username ? ' has-error' : ''}`} value={form.username} placeholder="e.g., johndoe" onChange={(e) => { setForm((f) => ({ ...f, username: e.target.value })); clearField('username') }} />
            {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className={`form-input${fieldErrors.email ? ' has-error' : ''}`} value={form.email} placeholder="e.g., john@example.com" onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); clearField('email') }} />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <PasswordInput className={`form-input${fieldErrors.password ? ' has-error' : ''}`} value={form.password} placeholder="Minimum 8 characters" onChange={(e) => { setForm((f) => ({ ...f, password: e.target.value })); clearField('password') }} />
            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'user' }))}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="form-submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </form>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Edit user modal
// ---------------------------------------------------------------------------

function EditUserModal({ open, onClose, user, onUpdated }: {
  open: boolean
  onClose: () => void
  user: AuthUser
  onUpdated: (user: AuthUser) => void
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'security'>('details')
  const [form, setForm] = useState({ username: user.username, email: user.email, role: user.role })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; email?: string }>({})
  const [saving, setSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwFieldError, setPwFieldError] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)

  useEffect(() => {
    if (!open) {
      setError('')
      setFieldErrors({})
      setPwError('')
      setPwFieldError('')
      return
    }
    setForm({ username: user.username, email: user.email, role: user.role })
    setError('')
    setFieldErrors({})
    setNewPassword('')
    setPwError('')
    setPwFieldError('')
    setPwSaved(false)
    setActiveTab('details')
  }, [open, user.id])

  const handleSubmit = async () => {
    const fe: typeof fieldErrors = {}
    if (!form.username.trim()) fe.username = 'Username is required'
    if (!form.email.trim()) fe.email = 'Email is required'
    if (Object.keys(fe).length > 0) { setFieldErrors(fe); return }

    setError('')
    setSaving(true)
    try {
      const updated = await updateUser(user.id, { username: form.username, email: form.email, role: form.role })
      onUpdated(updated)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? 'Failed to update user.')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword.trim()) { setPwFieldError('New password is required'); return }
    setPwError('')
    setPwFieldError('')
    setPwSaved(false)
    setPwSaving(true)
    try {
      await resetUserPassword(user.id, newPassword)
      setNewPassword('')
      setPwSaved(true)
      setTimeout(() => setPwSaved(false), 3000)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setPwError(detail ?? 'Failed to reset password.')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Edit User — ${user.username}`}>
      <div className={styles.modalForm}>
        <div className="form-tabs">
          <button type="button" className={activeTab === 'details' ? 'form-tab is-active' : 'form-tab'} onClick={() => setActiveTab('details')}>Details</button>
          <button type="button" className={activeTab === 'security' ? 'form-tab is-active' : 'form-tab'} onClick={() => setActiveTab('security')}>Security</button>
        </div>
        <div className="form-tab-panel">
          {activeTab === 'details' && (
            <form onSubmit={(e) => { e.preventDefault(); void handleSubmit() }}>
              {error && <div className="form-error">{error}</div>}
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className={`form-input${fieldErrors.username ? ' has-error' : ''}`} value={form.username} placeholder="e.g., johndoe" onChange={(e) => { setForm((f) => ({ ...f, username: e.target.value })); setFieldErrors((f) => ({ ...f, username: undefined })) }} />
                {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className={`form-input${fieldErrors.email ? ' has-error' : ''}`} value={form.email} placeholder="e.g., john@example.com" onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setFieldErrors((f) => ({ ...f, email: undefined })) }} />
                {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'user' }))}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="form-submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          )}
          {activeTab === 'security' && (
            <form onSubmit={(e) => { e.preventDefault(); void handleResetPassword() }}>
              <p className="form-hint">Set a new password for <strong>{user.username}</strong>. They will need to use it on their next login.</p>
              {pwError && <div className="form-error">{pwError}</div>}
              {pwSaved && <div className="form-success">Password reset successfully.</div>}
              <div className="form-group">
                <label className="form-label">New Password</label>
                <PasswordInput
                  className={`form-input${pwFieldError ? ' has-error' : ''}`}
                  value={newPassword}
                  placeholder="Enter new password"
                  onChange={(e) => { setNewPassword(e.target.value); setPwFieldError('') }}
                  autoFocus
                />
                {pwFieldError && <span className="field-error">{pwFieldError}</span>}
              </div>
              <button type="submit" className="form-submit" disabled={pwSaving}>
                {pwSaving ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Models tab — auto-saves on every change
// ---------------------------------------------------------------------------

function ModelsTab() {
  const [settings, setSettings] = useState<ModelSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [modelSearch, setModelSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    getModelSettings().then((data) => {
      setSettings(data)
    }).finally(() => setLoading(false))
  }, [])

  const save = (enabled: string[], defaultModel: string | null) => {
    if (enabled.length === 0) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const resolvedDefault = defaultModel && enabled.includes(defaultModel) ? defaultModel : enabled[0]
      setStatus('saving')
      try {
        const updated = await updateModelSettings(enabled, resolvedDefault)
        setSettings(updated)
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 2000)
      } catch {
        setStatus('error')
      }
    }, 400)
  }

  const toggleModel = (id: string) => {
    if (!settings) return
    const next = settings.enabled_models.includes(id)
      ? settings.enabled_models.filter((m) => m !== id)
      : [...settings.enabled_models, id]
    setSettings((s) => s ? { ...s, enabled_models: next } : s)
    save(next, settings.default_model)
  }

  const setDefault = (id: string) => {
    if (!settings) return
    setSettings((s) => s ? { ...s, default_model: id } : s)
    save(settings.enabled_models, id)
  }

  const handleEnableAll = () => {
    if (!settings) return
    const all = settings.accessible_models
    setSettings((s) => s ? { ...s, enabled_models: all } : s)
    save(all, settings.default_model)
  }

  const handleDisableAll = () => {
    if (!settings) return
    // Keep at least one enabled — keep the current default or first enabled
    const keepOne = settings.default_model ?? settings.enabled_models[0] ?? settings.accessible_models[0]
    if (!keepOne) return
    const next = [keepOne]
    setSettings((s) => s ? { ...s, enabled_models: next } : s)
    save(next, keepOne)
  }

  if (loading) return (
    <div className={styles.tabContent}>
      <ModelListSkeleton />
    </div>
  )
  if (!settings) return null

  const onlyOneEnabled = settings.enabled_models.length === 1

  const filteredModels = modelSearch.trim()
    ? settings.accessible_models.filter((id) => id.toLowerCase().includes(modelSearch.toLowerCase()))
    : settings.accessible_models

  return (
    <div className={styles.tabContent}>
      <div className={styles.tabToolbar}>
        <div className={styles.toolbarGroup}>
          <p className="form-hint" style={{ margin: 0 }}>Changes are saved automatically.</p>
          {status === 'saving' && <span className={styles.statusSaving}>Saving…</span>}
          {status === 'saved'  && <span className={styles.statusSaved}>Saved</span>}
          {status === 'error'  && <span className={styles.statusError}>Error saving</span>}
        </div>
        <div className={styles.toolbarGroup}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <Search size={12} style={{ position: 'absolute', left: '7px', color: 'var(--color-muted)', pointerEvents: 'none' }} />
            <input
              className={styles.searchInput}
              style={{ paddingLeft: '24px' }}
              placeholder="Search models…"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
            />
          </div>
          <button className={styles.systemBtn} onClick={handleEnableAll}>Enable All</button>
          <button
            className={styles.systemBtn}
            onClick={handleDisableAll}
            disabled={onlyOneEnabled}
            title={onlyOneEnabled ? 'At least one model must remain enabled' : undefined}
          >
            Disable All
          </button>
        </div>
      </div>
      <div className={styles.modelList}>
        {filteredModels.length === 0 && (
          <p className="form-hint" style={{ textAlign: 'center', padding: '16px 0' }}>No models match your search.</p>
        )}
        {filteredModels.map((id) => {
          const isEnabled = settings.enabled_models.includes(id)
          const isLastEnabled = onlyOneEnabled && isEnabled
          return (
            <label key={id} className={styles.modelRow}>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={() => toggleModel(id)}
                disabled={isLastEnabled}
                title={isLastEnabled ? 'At least one model must remain enabled' : undefined}
              />
              <span className={styles.modelId}>{id}</span>
              {isEnabled && (
                <label className={styles.defaultLabel} onClick={(e) => e.stopPropagation()}>
                  <input type="radio" name="default_model" checked={settings.default_model === id} onChange={() => setDefault(id)} />
                  default
                </label>
              )}
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// System settings modal
// ---------------------------------------------------------------------------

type FieldDef = { key: keyof SystemSettings; label: string; hint: string; placeholder?: string; type: 'number' | 'float' | 'bool'; min?: number; max?: number; step?: number }

const SYSTEM_FIELDS: FieldDef[] = [
  { key: 'llm_temperature',               label: 'LLM Temperature',           hint: 'Randomness of responses (0 = deterministic, 2 = very creative)',   placeholder: 'e.g., 0.7',   type: 'float',  min: 0,    max: 2,  step: 0.05 },
  { key: 'llm_max_tokens',                label: 'LLM Max Tokens',            hint: 'Maximum tokens the LLM can output per response',                   placeholder: 'e.g., 4096',  type: 'number', min: 256              },
  { key: 'stream_max_chars',              label: 'Stream Max Chars',          hint: 'Maximum characters streamed before truncation',                    placeholder: 'e.g., 32000', type: 'number', min: 1000             },
  { key: 'chat_history_max_tokens',       label: 'History Max Tokens',        hint: 'Total token budget for chat history context',                      placeholder: 'e.g., 8000',  type: 'number', min: 0                },
  { key: 'chat_history_max_message_tokens', label: 'Per-Message Max Tokens',  hint: 'Max tokens kept from a single history message',                    placeholder: 'e.g., 2000',  type: 'number', min: 0                },
  { key: 'chat_history_max_messages',     label: 'History Max Messages',      hint: 'Maximum number of past messages in context',                       placeholder: 'e.g., 20',    type: 'number', min: 1                },
  { key: 'chunk_size',                    label: 'Chunk Size',                hint: 'Characters per document chunk when ingesting files',               placeholder: 'e.g., 1000',  type: 'number', min: 100              },
  { key: 'chunk_overlap',                 label: 'Chunk Overlap',             hint: 'Overlapping characters between adjacent chunks',                   placeholder: 'e.g., 200',   type: 'number', min: 0                },
  { key: 'retrieval_k',                   label: 'Retrieval K',               hint: 'Document chunks retrieved per query',                              placeholder: 'e.g., 4',     type: 'number', min: 1,    max: 20   },
  { key: 'summary_max_tokens',            label: 'Summary Max Tokens',        hint: 'Max tokens for the rolling conversation summary',                  placeholder: 'e.g., 512',   type: 'number', min: 50               },
  { key: 'enable_summary_memory',         label: 'Enable Summary Memory',     hint: 'Summarise long conversations to preserve context space',                                       type: 'bool'                          },
  { key: 'max_upload_file_size_mb',       label: 'Max Upload Size (MB)',      hint: 'Maximum file size users can upload',                               placeholder: 'e.g., 10',    type: 'number', min: 1,    max: 100  },
  { key: 'access_token_expire_minutes',   label: 'Session Duration (minutes)', hint: 'How long login sessions stay valid before requiring re-login',    placeholder: 'e.g., 10080', type: 'number', min: 60               },
]

function SystemSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [values, setValues] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SystemSettings, string>>>({})

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setFieldErrors({})
    setSaveError('')
    getSystemSettings().then(setValues).finally(() => setLoading(false))
  }, [open])

  const set = (key: keyof SystemSettings, value: unknown) => {
    setValues((prev) => prev ? { ...prev, [key]: value } : prev)
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const handleSave = async () => {
    if (!values) return
    const fe: typeof fieldErrors = {}
    SYSTEM_FIELDS.forEach((f) => {
      if (f.type === 'bool') return
      const v = values[f.key] as number
      if (isNaN(v)) { fe[f.key] = 'Required'; return }
      if (f.min !== undefined && v < f.min) fe[f.key] = `Min ${f.min}`
      if (f.max !== undefined && v > f.max) fe[f.key] = `Max ${f.max}`
    })
    if (Object.keys(fe).length > 0) { setFieldErrors(fe); return }

    setSaving(true); setSaveError(''); setSaved(false)
    try {
      const updated = await updateSystemSettings(values)
      setValues(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setSaveError(detail ?? 'Failed to save.')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="System Settings">
      <div className={styles.modalForm}>
        {loading && <SystemSettingsSkeleton />}
        {!loading && values && (
          <>
            <p className="form-hint">Changes take effect on next server restart.</p>
            {saveError && <div className="form-error">{saveError}</div>}
            {saved && <div className="form-success">Saved. Restart the server to apply.</div>}
            <div className={styles.systemGrid}>
              {SYSTEM_FIELDS.map((f) => (
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  {f.type === 'bool' ? (
                    <label className={styles.toggleRow}>
                      <input type="checkbox" checked={values[f.key] as boolean} onChange={(e) => set(f.key, e.target.checked)} />
                      <span>{values[f.key] ? 'Enabled' : 'Disabled'}</span>
                    </label>
                  ) : (
                    <input
                      type="number"
                      className={`form-input${fieldErrors[f.key] ? ' has-error' : ''}`}
                      value={values[f.key] as number}
                      placeholder={f.placeholder}
                      min={f.min} max={f.max} step={f.step ?? 1}
                      onChange={(e) => set(f.key, f.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value, 10))}
                    />
                  )}
                  {fieldErrors[f.key]
                    ? <span className="field-error">{fieldErrors[f.key]}</span>
                    : <span className="form-hint">{f.hint}</span>}
                </div>
              ))}
            </div>
            <button className="form-submit" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
