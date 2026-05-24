import * as SecureStore from 'expo-secure-store'
import { createContext, useContext } from 'react'
import type { AuthResponse } from './api'

export type AuthUser = {
  user_id: number
  full_name: string
  role: string
  must_change_password: boolean
}

export type AuthState = {
  user: AuthUser | null
  isLoading: boolean
  signIn: (data: AuthResponse) => Promise<void>
  signOut: () => Promise<void>
  clearMustChangePassword: () => void
}

export const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
  clearMustChangePassword: () => {},
})

export const useAuth = () => useContext(AuthContext)

export async function saveAuth(data: AuthResponse) {
  await SecureStore.setItemAsync('access_token', data.access_token)
  await SecureStore.setItemAsync('refresh_token', data.refresh_token)
  await SecureStore.setItemAsync(
    'user',
    JSON.stringify({
      user_id: data.user_id,
      full_name: data.full_name,
      role: data.role,
      must_change_password: data.must_change_password,
    } satisfies AuthUser),
  )
}

export async function loadStoredUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync('user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export async function clearAuth() {
  await SecureStore.deleteItemAsync('access_token')
  await SecureStore.deleteItemAsync('refresh_token')
  await SecureStore.deleteItemAsync('user')
}

export async function persistMustChangePasswordCleared() {
  const raw = await SecureStore.getItemAsync('user')
  if (!raw) return
  try {
    const u = JSON.parse(raw) as AuthUser
    await SecureStore.setItemAsync('user', JSON.stringify({ ...u, must_change_password: false }))
  } catch {}
}
