import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type {
  AuthUser,
  ChangePassword,
  LoginCredentials,
  RegisterCredentials,
  UpdateProfile,
  UserPreferences,
} from '../types/auth'
import { DEFAULT_PREFERENCES } from '../types/auth'
import api from '../services/api'
import {
  changePasswordApi,
  clearSession,
  getStoredToken,
  getStoredUser,
  loginApi,
  registerApi,
  storeSession,
  updatePreferencesApi,
  updateProfileApi,
} from '../services/auth'
import { applyTheme } from '../utils/theme'

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => void
  updateUser: (data: UpdateProfile) => Promise<void>
  changePassword: (data: ChangePassword) => Promise<void>
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser)
  const [token, setToken] = useState<string | null>(getStoredToken)
  const [isLoading, setIsLoading] = useState(false)

  // Keep axios default header in sync with token state
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete api.defaults.headers.common['Authorization']
    }
  }, [token])

  // Apply theme whenever user/preferences change (including on first load)
  useEffect(() => {
    const prefs = user?.preferences ?? DEFAULT_PREFERENCES
    applyTheme({ theme: prefs.theme, accent: prefs.accent })
  }, [user])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true)
    try {
      const data = await loginApi(credentials)
      storeSession(data.access_token, data.user)
      setToken(data.access_token)
      setUser(data.user)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setIsLoading(true)
    try {
      const data = await registerApi(credentials)
      storeSession(data.access_token, data.user)
      setToken(data.access_token)
      setUser(data.user)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setToken(null)
    setUser(null)
    applyTheme({ theme: 'dark', accent: 'indigo' })
  }, [])

  const updateUser = useCallback(async (data: UpdateProfile) => {
    const updated = await updateProfileApi(data)
    setUser((prev) => {
      if (!prev) return updated
      const next = { ...updated, preferences: prev.preferences }
      if (token) storeSession(token, next)
      return next
    })
  }, [token])

  const changePassword = useCallback(async (data: ChangePassword) => {
    await changePasswordApi(data)
  }, [])

  const updatePreferences = useCallback(async (patch: Partial<UserPreferences>) => {
    const updated = await updatePreferencesApi(patch)
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, preferences: updated }
      if (token) storeSession(token, next)
      return next
    })
  }, [token])

  return (
    <AuthContext.Provider value={{
      user, token, isLoading,
      login, register, logout,
      updateUser, changePassword, updatePreferences,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
