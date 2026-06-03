export type FieldName = string

export type FormValues = Record<FieldName, string>

export type FormErrors<TValues extends FormValues> = Partial<Record<keyof TValues, string>>
