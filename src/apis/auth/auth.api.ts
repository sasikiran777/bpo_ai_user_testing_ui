import { http, isApiConfigured } from '@/config/http_handler'
import type { LoginRequest, LoginResponse } from '@/types/auth/auth.types'

const mockLogin = async (payload: LoginRequest): Promise<LoginResponse> => {
  await new Promise((r) => setTimeout(r, 500))

  return {
    token: 'mock-token',
    user: {
      id: 'mock-user',
      name: payload.email.split('@')[0] || 'User',
      email: payload.email,
    },
  }
}

export const loginApi = async (payload: LoginRequest): Promise<LoginResponse> => {
  if (!isApiConfigured) return mockLogin(payload)

  try {
    const { data } = await http.post<LoginResponse>('/auth/login', payload)
    return data
  } catch (e) {
    const status = (e as { status?: number } | undefined)?.status
    if (import.meta.env.DEV && typeof status === 'undefined') return mockLogin(payload)
    throw e
  }
}
