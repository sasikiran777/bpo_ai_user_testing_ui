import { email, minLength, minValue, required } from '@regle/rules'

export const registerRules = {
  firstName: { required },
  lastName: { required },
  phone: { required },
  email: { required, email },
  password: { required, minLength: minLength(6) },
  totalExpMonths: { required, minValue: minValue(0) },
  skills: { required, minLength: minLength(1) },
}

