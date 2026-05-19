import { useAuth } from '../../../app/providers/auth-provider'
import type { LoginRequest } from '../../../shared/types/auth'
import { loginWithPassword } from '../api/login'

export function useLogin() {
  const { setSession } = useAuth()

  return async (payload: LoginRequest) => {
    const session = await loginWithPassword(payload)
    setSession(session)
  }
}
