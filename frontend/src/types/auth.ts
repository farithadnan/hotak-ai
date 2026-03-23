export type AccentColor = 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'slate'
export type ThemeMode = 'dark' | 'light'
export type ChatBackground = 'none' | 'dots' | 'grid' | 'gradient-warm' | 'gradient-cool' | 'gradient-purple'

export type UserPreferences = {
  theme: ThemeMode
  accent: AccentColor
  chat_background: ChatBackground
  default_model: string | null
  default_system_prompt: string | null
  avatar: string | null
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  accent: 'indigo',
  chat_background: 'none',
  default_model: null,
  default_system_prompt: null,
  avatar: null,
}

export type AuthUser = {
  id: string
  username: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  last_login_at: string | null
  preferences: UserPreferences
}

export type TokenResponse = {
  access_token: string
  token_type: string
  user: AuthUser
}

export type LoginCredentials = {
  username: string
  password: string
}

export type RegisterCredentials = {
  username: string
  email: string
  password: string
}

export type UpdateProfile = {
  username?: string
  email?: string
}

export type ChangePassword = {
  current_password: string
  new_password: string
}
