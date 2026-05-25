import type { UseFormReturn } from 'react-hook-form'
import { FormProvider } from 'react-hook-form'

import Button from '../../../shared/ui/Button'
import FormSelectLocale from '../../../shared/ui/form/FormSelectLocale'
import { FormSelectStrategy } from '../../../shared/ui/form/FormSelectStrategy'
import { FormCheckboxPublish } from '../../../shared/ui/form/FormCheckboxPublish'

import { FORM_FIELDS } from '../model/constants'
import type { FormValues } from '../model/schema'
import styles from './styles.module.scss'

type DocumentTranslationFormProps = {
  form: UseFormReturn<FormValues>
  onSubmit: (values: FormValues) => Promise<void>
  hasDrafts?: boolean
}

export function DocumentTranslationForm({ form, onSubmit, hasDrafts }: DocumentTranslationFormProps) {
  return (
    <FormProvider {...form}>
      <fieldset className={styles.fieldset}>
        <div className={styles.row}>
          <FormSelectLocale label="From" name={FORM_FIELDS.SOURCE_LNG} />
          <FormSelectLocale label="To" name={FORM_FIELDS.TARGET_LNG} />
        </div>
        <FormSelectStrategy name={FORM_FIELDS.STRATEGY} />
        {hasDrafts && <FormCheckboxPublish name={FORM_FIELDS.PUBLISH_ON_TRANSLATION} />}
        <input {...form.register(FORM_FIELDS.HIDDEN_COLLECTION_SLUG)} type="hidden" />
        <input {...form.register(FORM_FIELDS.HIDDEN_COLLECTION_ID)} type="hidden" />
        <Button
          $variant="filled"
          disabled={form.formState.isSubmitting}
          className={styles['submit-button']}
          onClick={form.handleSubmit(onSubmit)}
          type="submit"
          $size="lg"
          $isLoading={form.formState.isSubmitting}
        >
          Queue Translation
        </Button>
      </fieldset>
    </FormProvider>
  )
}
