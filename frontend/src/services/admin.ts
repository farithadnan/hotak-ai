import api from './api'
import type { AuthUser } from '../types/auth'

export type AdminUserCreate = {
  username: string
  email: string
  password: string
  role: 'admin' | 'user'
}

export type ModelSettings = {
  enabled_models: string[]
  default_model: string | null
  accessible_models: string[]
}

export async function listUsers(): Promise<AuthUser[]> {
  const res = await api.get<AuthUser[]>('/admin/users')
  return res.data
}

export async function createUser(data: AdminUserCreate): Promise<AuthUser> {
  const res = await api.post<AuthUser>('/admin/users', data)
  return res.data
}

export async function lockUser(userId: string): Promise<AuthUser> {
  const res = await api.patch<AuthUser>(`/admin/users/${userId}/lock`)
  return res.data
}

export async function unlockUser(userId: string): Promise<AuthUser> {
  const res = await api.patch<AuthUser>(`/admin/users/${userId}/unlock`)
  return res.data
}

export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/admin/users/${userId}`)
}

export async function updateUser(userId: string, data: { username?: string; email?: string; role?: string }): Promise<AuthUser> {
  const res = await api.patch<AuthUser>(`/admin/users/${userId}`, data)
  return res.data
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<AuthUser> {
  const res = await api.post<AuthUser>(`/admin/users/${userId}/reset-password`, { new_password: newPassword })
  return res.data
}

export async function getModelSettings(): Promise<ModelSettings> {
  const res = await api.get<ModelSettings>('/admin/models')
  return res.data
}

export type SystemSettings = {
  llm_temperature: number
  llm_max_tokens: number
  stream_max_chars: number
  chat_history_max_tokens: number
  chat_history_max_message_tokens: number
  chat_history_max_messages: number
  chunk_size: number
  chunk_overlap: number
  retrieval_k: number
  summary_max_tokens: number
  enable_summary_memory: boolean
  max_upload_file_size_mb: number
  access_token_expire_minutes: number
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const res = await api.get<SystemSettings>('/admin/system')
  return res.data
}

export async function updateSystemSettings(data: SystemSettings): Promise<SystemSettings> {
  const res = await api.put<SystemSettings>('/admin/system', data)
  return res.data
}

export async function updateModelSettings(
  enabled_models: string[],
  default_model: string | null,
): Promise<ModelSettings> {
  const res = await api.put<ModelSettings>('/admin/models', { enabled_models, default_model })
  return res.data
}
