import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { AuthUser, LoginCredentials, RegisterCredentials } from '../types/auth'
import api from '../services/api'
import {
  clearSession,
  getStoredToken,
  getStoredUser,
  loginApi,
  registerApi,
  storeSession,
} from '../services/auth'

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => void
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
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
