import { computed, reactive } from 'vue'
import { useRegle } from '@regle/core'
import { useAuth } from '@/composables/auth/useAuth'
import { registerRules } from '@/validations/auth/register.validation'
import { useRouter } from 'vue-router'

type RegisterFormValues = {
  firstName: string
  lastName: string
  phone: string
  email: string
  password: string
  totalExpMonths: string
  skills: string[]
  pastJobTitle: string
  company: string
}

export const useRegisterForm = () => {
  const auth = useAuth()
  const router = useRouter()

  const values = reactive<RegisterFormValues>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    totalExpMonths: '0',
    skills: [],
    pastJobTitle: '',
    company: '',
  })

  const skillsText = computed({
    get: () => values.skills.join(', '),
    set: (v: string) => {
      values.skills = v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    },
  })

  const { r$ } = useRegle(values, registerRules)

  const readErrorMessage = (err: unknown) => {
    if (!err) return ''
    if (typeof err === 'string') return err
    if (typeof err === 'object' && err && '$message' in err) {
      const msg = (err as { $message?: unknown }).$message
      return String(msg ?? '')
    }
    return String(err)
  }

  const firstError = (errs: unknown) => {
    if (!errs) return null
    if (Array.isArray(errs)) return errs[0] ?? null
    if (typeof errs === 'object') return Object.values(errs as Record<string, unknown>)[0] ?? null
    return errs
  }

  const errors = {
    firstName: computed(() =>
      r$.firstName.$dirty ? readErrorMessage(firstError(r$.firstName.$errors as unknown)) : '',
    ),
    lastName: computed(() =>
      r$.lastName.$dirty ? readErrorMessage(firstError(r$.lastName.$errors as unknown)) : '',
    ),
    phone: computed(() => (r$.phone.$dirty ? readErrorMessage(firstError(r$.phone.$errors as unknown)) : '')),
    email: computed(() => (r$.email.$dirty ? readErrorMessage(firstError(r$.email.$errors as unknown)) : '')),
    password: computed(() =>
      r$.password.$dirty ? readErrorMessage(firstError(r$.password.$errors as unknown)) : '',
    ),
    totalExpMonths: computed(() =>
      r$.totalExpMonths.$dirty
        ? readErrorMessage(firstError(r$.totalExpMonths.$errors as unknown))
        : '',
    ),
    skills: computed(() => (r$.skills.$dirty ? readErrorMessage(firstError(r$.skills.$errors as unknown)) : '')),
  }

  const touch = (field?: keyof RegisterFormValues) => {
    if (field) r$[field].$touch()
    else r$.$touch()
  }

  const canSubmit = computed(() => !auth.loading.value)

  const submit = async () => {
    const ok = await r$.$validate()
    if (!ok) {
      r$.$touch()
      return
    }

    const total = Number(values.totalExpMonths)
    await auth.register({
      first_name: values.firstName.trim(),
      last_name: values.lastName.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      password: values.password,
      total_exp_months: Number.isFinite(total) ? total : 0,
      skills: values.skills,
      past_job_title: values.pastJobTitle.trim() || undefined,
      company: values.company.trim() || undefined,
    })
    router.replace({ name: 'dashboard' })
  }

  return {
    values,
    skillsText,
    errors,
    canSubmit,
    touch,
    submit,
    auth,
    r$,
  }
}
