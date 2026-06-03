import { email, minLength, required } from '@regle/rules'

export const loginRules = {
  email: { required, email },
  password: { required, minLength: minLength(6) },
}
