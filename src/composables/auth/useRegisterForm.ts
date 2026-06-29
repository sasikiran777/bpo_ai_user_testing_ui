import { computed, reactive } from 'vue'
import { useAuth } from '@/composables/auth/useAuth'
import { useRouter } from 'vue-router'

type CountryCode = '+1' | '+52'

type RegisterFormValues = {
  firstName: string
  middleName: string
  lastName: string
  countryCode: CountryCode
  phone: string
  email: string
  totalExpMonths: string
  desiredPosition: string
}

type RegisterField = keyof RegisterFormValues

type SelectOption<T extends string = string> = {
  label: string
  value: T
}

const countryOptions: SelectOption<CountryCode>[] = [
  { label: 'US (+1)', value: '+1' },
  { label: 'MX (+52)', value: '+52' },
]

const positionOptions: SelectOption[] = [
  { label: 'Select a position (optional)', value: '' },
  { label: 'Customer Support Representative', value: 'Customer Support Representative' },
  { label: 'Technical Support Specialist', value: 'Technical Support Specialist' },
  { label: 'Call Center Agent', value: 'Call Center Agent' },
  { label: 'Virtual Assistant', value: 'Virtual Assistant' },
  { label: 'Data Entry Specialist', value: 'Data Entry Specialist' },
  { label: 'Sales Representative', value: 'Sales Representative' },
  { label: 'Appointment Setter', value: 'Appointment Setter' },
  { label: 'Collections Specialist', value: 'Collections Specialist' },
  { label: 'Retention Specialist', value: 'Retention Specialist' },
  { label: 'Quality Assurance Analyst', value: 'Quality Assurance Analyst' },
  { label: 'Team Leader', value: 'Team Leader' },
  { label: 'Operations Supervisor', value: 'Operations Supervisor' },
  { label: 'Recruiter', value: 'Recruiter' },
  { label: 'HR Assistant', value: 'HR Assistant' },
  { label: 'Bookkeeper', value: 'Bookkeeper' },
  { label: 'Accounts Receivable Specialist', value: 'Accounts Receivable Specialist' },
  { label: 'Accounts Payable Specialist', value: 'Accounts Payable Specialist' },
  { label: 'Medical Biller', value: 'Medical Biller' },
  { label: 'Medical Coder', value: 'Medical Coder' },
  { label: 'Dispatcher', value: 'Dispatcher' },
  { label: 'Executive Assistant', value: 'Executive Assistant' },
  { label: 'Social Media Manager', value: 'Social Media Manager' },
  { label: 'Content Moderator', value: 'Content Moderator' },
  { label: 'Email Support Specialist', value: 'Email Support Specialist' },
  { label: 'Chat Support Specialist', value: 'Chat Support Specialist' },
  { label: 'CRM Specialist', value: 'CRM Specialist' },
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_DIGIT_COUNT: Record<CountryCode, number> = {
  '+1': 10,
  '+52': 10,
}
const PASSWORD_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
const ALL_FIELDS: RegisterField[] = [
  'firstName',
  'middleName',
  'lastName',
  'countryCode',
  'phone',
  'email',
  'totalExpMonths',
  'desiredPosition',
]

const normalizeDigits = (value: string) => value.replace(/\D/g, '')

const formatPhoneNumber = (value: string, countryCode: CountryCode) => {
  const digits = normalizeDigits(value).slice(0, PHONE_DIGIT_COUNT[countryCode])

  if (countryCode === '+1') {
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`
  return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`
}

const isPhoneValid = (value: string, countryCode: CountryCode) =>
  normalizeDigits(value).length === PHONE_DIGIT_COUNT[countryCode]

const randomIndex = (max: number) => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    return (array[0] ?? 0) % max
  }

  return Math.floor(Math.random() * max)
}

const generatePassword = () => {
  const length = 6 + randomIndex(3)
  let password = ''

  for (let index = 0; index < length; index += 1) {
    password += PASSWORD_CHARACTERS[randomIndex(PASSWORD_CHARACTERS.length)]
  }

  return password
}

const toCamelCase = (value: string) => {
  const words = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .map((word) => word.trim())
    .filter(Boolean)

  if (!words.length) return ''

  return words
    .map((word, index) => {
      const lowerWord = word.toLowerCase()
      if (index === 0) return lowerWord
      return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1)
    })
    .join('')
}

export const useRegisterForm = () => {
  const auth = useAuth()
  const router = useRouter()

  const values = reactive<RegisterFormValues>({
    firstName: '',
    middleName: '',
    lastName: '',
    countryCode: '+52',
    phone: '',
    email: '',
    totalExpMonths: '',
    desiredPosition: '',
  })

  const touched = reactive<Record<RegisterField, boolean>>({
    firstName: false,
    middleName: false,
    lastName: false,
    countryCode: false,
    phone: false,
    email: false,
    totalExpMonths: false,
    desiredPosition: false,
  })

  const showCareerFields = computed(() => EMAIL_PATTERN.test(values.email.trim()))

  const phoneDisplay = computed({
    get: () => formatPhoneNumber(values.phone, values.countryCode),
    set: (value: string) => {
      values.phone = formatPhoneNumber(value, values.countryCode)
    },
  })

  const getFieldError = (field: RegisterField) => {
    switch (field) {
      case 'firstName':
        return values.firstName.trim() ? '' : 'This field is required'
      case 'lastName':
        return values.lastName.trim() ? '' : 'This field is required'
      case 'phone':
        if (!values.phone.trim()) return 'This field is required'
        if (isPhoneValid(values.phone, values.countryCode)) return ''
        return values.countryCode === '+1'
          ? 'Enter a valid 10-digit US phone number'
          : 'Enter a valid 10-digit MX phone number'
      case 'email':
        if (!values.email.trim()) return 'This field is required'
        return EMAIL_PATTERN.test(values.email.trim()) ? '' : 'Enter a valid email address'
      case 'totalExpMonths':
        if (!values.totalExpMonths.trim()) return ''
        return /^\d+$/.test(values.totalExpMonths.trim()) ? '' : 'Enter a valid number of months'
      default:
        return ''
    }
  }

  const errors = {
    firstName: computed(() => (touched.firstName ? getFieldError('firstName') : '')),
    lastName: computed(() => (touched.lastName ? getFieldError('lastName') : '')),
    phone: computed(() => (touched.phone ? getFieldError('phone') : '')),
    email: computed(() => (touched.email ? getFieldError('email') : '')),
    totalExpMonths: computed(() => (touched.totalExpMonths ? getFieldError('totalExpMonths') : '')),
  }

  const touch = (field?: RegisterField) => {
    if (field) {
      touched[field] = true
      return
    }

    for (const currentField of ALL_FIELDS) {
      touched[currentField] = true
    }
  }

  const canSubmit = computed(() => !auth.loading.value)

  const submit = async () => {
    touch()

    const invalidField = ALL_FIELDS.find((field) => Boolean(getFieldError(field)))
    if (invalidField) return

    const desiredPosition = toCamelCase(values.desiredPosition)
    const total = Number(values.totalExpMonths)

    await auth.register({
      first_name: values.firstName.trim(),
      middle_name: values.middleName.trim() || undefined,
      last_name: values.lastName.trim(),
      country_code: values.countryCode,
      phone: normalizeDigits(values.phone),
      email: values.email.trim(),
      password: generatePassword(),
      total_exp_months: Number.isFinite(total) ? total : 0,
      skills: desiredPosition ? [desiredPosition] : [],
    })
    router.replace({ name: 'dashboard' })
  }

  return {
    values,
    errors,
    canSubmit,
    touch,
    submit,
    auth,
    phoneDisplay,
    showCareerFields,
    countryOptions,
    positionOptions,
  }
}
