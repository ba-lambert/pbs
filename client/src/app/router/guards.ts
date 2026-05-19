import { redirect } from '@tanstack/react-router'
import { getToken } from '../../shared/lib/auth-storage'

export function requireAuth() {
  if (!getToken()) {
    throw redirect({ to: '/login' })
  }
}

export function redirectIfAuthenticated() {
  if (getToken()) {
    throw redirect({ to: '/dashboard' })
  }
}
