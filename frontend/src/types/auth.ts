export type AuthUser = {
  id: string
  username: string
  email: string
  role: string
  is_active: boolean
  created_at: string
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
