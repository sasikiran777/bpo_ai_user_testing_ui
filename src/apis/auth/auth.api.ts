import { http } from '@/config/http_handler'
import type { ApiEnvelope } from '@/types/api/api.types'
import type { LoginRequest, LoginResult, RegisterRequest, RegisterResult } from '@/types/auth/auth.types'

const unwrap = <T>(envelope: ApiEnvelope<T>): T => {
  if (!envelope.success) {
    throw { status: 200, message: envelope.message ?? 'Request failed', raw: envelope }
  }
  return envelope.data
}

export const loginApi = async (payload: LoginRequest): Promise<LoginResult> => {
  const { data } = await http.post<ApiEnvelope<LoginResult>>('/auth/login', payload)
  return unwrap(data)
}

export const registerApi = async (payload: RegisterRequest): Promise<RegisterResult> => {
  const { data } = await http.post<ApiEnvelope<RegisterResult>>('/auth/register', payload)
  return unwrap(data)
}
