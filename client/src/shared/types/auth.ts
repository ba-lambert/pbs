export type UserRole = 'super_admin' | 'company_admin' | 'company_operator' | (string & {})

export interface AuthSession {
  accessToken: string
  role: UserRole
}

export interface LoginRequest {
  email: string
  password: string
}
