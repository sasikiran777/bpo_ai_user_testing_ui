import { http, isApiConfigured } from '@/config/http_handler'
import type { ApiEnvelope } from '@/types/api/api.types'
import type { LoginRequest, LoginResult, RegisterRequest, RegisterResult } from '@/types/auth/auth.types'

const mockLogin = async (payload: LoginRequest): Promise<LoginResult> => {
  await new Promise((r) => setTimeout(r, 500))

  return {
    token: 'mock-token',
    firstName: payload.email.split('@')[0] || 'User',
  }
}

const mockRegister = async (payload: RegisterRequest): Promise<RegisterResult> => {
  await new Promise((r) => setTimeout(r, 600))
  return { token: 'mock-token', firstName: payload.first_name }
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => {
  if (!envelope.success) {
    throw { status: 200, message: envelope.message ?? 'Request failed', raw: envelope }
  }
  return envelope.data
}

export const loginApi = async (payload: LoginRequest): Promise<LoginResult> => {
  if (!isApiConfigured) return mockLogin(payload)

  try {
    const { data } = await http.post<ApiEnvelope<LoginResult>>('/auth/login', payload)
    return unwrap(data)
  } catch (e) {
    const status = (e as { status?: number } | undefined)?.status
    if (import.meta.env.DEV && typeof status === 'undefined') return mockLogin(payload)
    throw e
  }
}

export const registerApi = async (payload: RegisterRequest): Promise<RegisterResult> => {
  if (!isApiConfigured) return mockRegister(payload)

  try {
    const { data } = await http.post<ApiEnvelope<RegisterResult>>('/auth/register', payload)
    return unwrap(data)
  } catch (e) {
    const status = (e as { status?: number } | undefined)?.status
    if (import.meta.env.DEV && typeof status === 'undefined') return mockRegister(payload)
    throw e
  }
}
