import { computed, ref } from 'vue'
import { loginApi } from '@/apis/auth/auth.api'
import type { ApiError } from '@/types/api/api.types'
import type { LoginRequest, User } from '@/types/auth/auth.types'

const token = ref<string | null>(
  localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token'),
)
const user = ref<User | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

export const useAuth = () => {
  const isAuthenticated = computed(() => Boolean(token.value))

  const login = async (payload: LoginRequest, options?: { remember?: boolean }) => {
    loading.value = true
    error.value = null

    try {
      const res = await loginApi(payload)
      token.value = res.token
      user.value = res.user
      if (options?.remember) {
        localStorage.setItem('auth_token', res.token)
        sessionStorage.removeItem('auth_token')
      } else {
        sessionStorage.setItem('auth_token', res.token)
        localStorage.removeItem('auth_token')
      }
      return res
    } catch (e) {
      const apiError = e as ApiError
      error.value = apiError.message ?? 'Login failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_token')
  }

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
  }
}
