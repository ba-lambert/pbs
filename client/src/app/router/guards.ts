import { redirect } from '@tanstack/react-router'
import { getToken, getRole } from '../../shared/lib/auth-storage'

export function requireAuth() {
  if (!getToken()) {
    throw redirect({ to: '/login' })
  }
}

export function requireAdminRole() {
  if (!getToken()) {
    throw redirect({ to: '/login' })
  }
  if (getRole() === 'driver') {
    throw redirect({ to: '/driver' })
  }
}

export function redirectIfAuthenticated() {
  const token = getToken()
  if (token) {
    throw redirect({ to: getRole() === 'driver' ? '/driver' : '/dashboard' })
  }
}
