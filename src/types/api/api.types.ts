export type ApiError = {
  status?: number
  message: string
  raw?: unknown
}

export type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data: T
}
