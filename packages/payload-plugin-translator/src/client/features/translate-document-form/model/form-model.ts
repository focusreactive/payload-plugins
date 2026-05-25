'use client'

import type { UseFormReturn } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { defaultValues } from './constants'
import type { FormInput, FormValues } from './schema'
import { validationSchema } from './schema'

type UseFormReturn_ = {
  form: UseFormReturn<FormValues>
}

type UseFormProps = {
  initialValues?: FormInput
  disabled?: boolean
}

export const useTranslateDocumentForm = ({ initialValues, disabled }: UseFormProps = {}): UseFormReturn_ => {
  const defaultFormValues = useMemo(
    () => ({
      ...defaultValues,
      ...initialValues,
    }),
    [initialValues],
  )

  const form = useForm<FormValues>({
    defaultValues: defaultFormValues,
    resolver: zodResolver(validationSchema),
    mode: 'onTouched',
    disabled,
  })

  useEffect(() => {
    form.reset(defaultFormValues)
  }, [defaultFormValues, form, form.reset])

  return { form }
}
