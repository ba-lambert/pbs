import { apiClient } from '../../../shared/api/client'
import type { AuthSession, LoginRequest } from '../../../shared/types/auth'

export async function loginWithPassword(payload: LoginRequest): Promise<AuthSession> {
  const response = await apiClient.post('/auth/login', payload)

  return {
    accessToken: response.data.access_token,
    role: response.data.role ?? 'super_admin',
  }
}
