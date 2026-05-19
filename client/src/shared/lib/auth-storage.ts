import type { AuthSession, UserRole } from '../types/auth'

const ACCESS_TOKEN_KEY = 'pbs_access_token'
const ROLE_KEY = 'pbs_role'

function getStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function saveAuth(accessToken: string, role: UserRole) {
  const storage = getStorage()
  if (!storage) return

  storage.setItem(ACCESS_TOKEN_KEY, accessToken)
  storage.setItem(ROLE_KEY, role)
}

export function readAuth(): AuthSession | null {
  const accessToken = getToken()
  const role = getRole()

  if (!accessToken || !role) return null

  return { accessToken, role }
}

export function getToken() {
  return getStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null
}

export function getRole() {
  return getStorage()?.getItem(ROLE_KEY)
}

export function clearAuth() {
  const storage = getStorage()
  if (!storage) return

  storage.removeItem(ACCESS_TOKEN_KEY)
  storage.removeItem(ROLE_KEY)
}
