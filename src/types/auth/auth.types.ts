export type LoginRequest = {
  email: string
  password: string
}

export type AuthUser = {
  firstName: string
  lastName?: string
  email?: string
}

export type LoginResult = {
  token: string
  firstName: string
}

export type RegisterRequest = {
  first_name: string
  middle_name?: string
  last_name: string
  phone: string
  email: string
  password: string
  total_exp_months: number
  skills: string[]
  past_job_title?: string
  company?: string
}

export type RegisterResult = LoginResult
