import axios, { AxiosError } from 'axios'

export const apiBaseUrl = (
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  ''
).trim()
export const isApiConfigured = apiBaseUrl.length > 0

export const http = axios.create({
  baseURL: apiBaseUrl || undefined,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token')

  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ||
      error.message ||
      'Request failed'

    return Promise.reject({
      status: error.response?.status,
      message,
      raw: error,
    })
  },
)
