import api from './api'
import type { AuthUser, LoginCredentials, RegisterCredentials, TokenResponse } from '../types/auth'

export const TOKEN_KEY = 'hotak_access_token'
export const USER_KEY = 'hotak_user'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function storeSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function loginApi(credentials: LoginCredentials): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>('/auth/login', credentials)
  return res.data
}

export async function registerApi(credentials: RegisterCredentials): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>('/auth/register', credentials)
  return res.data
}

export async function getMeApi(): Promise<AuthUser> {
  const res = await api.get<AuthUser>('/auth/me')
  return res.data
}
