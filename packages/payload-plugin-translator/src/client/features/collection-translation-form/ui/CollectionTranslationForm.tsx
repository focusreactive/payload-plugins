import type { UseFormReturn } from 'react-hook-form'
import { FormProvider } from 'react-hook-form'

import Button from '../../../shared/ui/Button'
import FormSelectLocale from '../../../shared/ui/form/FormSelectLocale'
import { FormSelectStrategy } from '../../../shared/ui/form/FormSelectStrategy'
import { FormCheckboxPublish } from '../../../shared/ui/form/FormCheckboxPublish'

import { FORM_FIELDS } from '../model/constants'
import type { FormValues } from '../model/schema'
import styles from './styles.module.scss'

type CollectionTranslationFormProps = {
  form: UseFormReturn<FormValues>
  onSubmit: (values: FormValues) => Promise<void>
  selectedCount: number
  hasDrafts: boolean
}

export function CollectionTranslationForm({
  form,
  onSubmit,
  selectedCount,
  hasDrafts,
}: CollectionTranslationFormProps) {
  return (
    <FormProvider {...form}>
      <fieldset className={styles.fieldset}>
        <div className={styles.row}>
          <div className={styles['locale-group']}>
            <FormSelectLocale
              label="From"
              className={styles['select-locale-field']}
              size="md"
              name={FORM_FIELDS.SOURCE_LNG}
            />
            <FormSelectLocale
              label="To"
              className={styles['select-locale-field']}
              size="md"
              name={FORM_FIELDS.TARGET_LNG}
            />
          </div>
          <FormSelectStrategy className={styles['strategy-field']} name={FORM_FIELDS.STRATEGY} size="md" />
        </div>
        {hasDrafts && <FormCheckboxPublish name={FORM_FIELDS.PUBLISH_ON_TRANSLATION} />}
        <input {...form.register(FORM_FIELDS.HIDDEN_COLLECTION_SLUG)} type="hidden" />
        <Button
          $variant="filled"
          disabled={form.formState.isSubmitting || selectedCount === 0}
          className={styles['submit-button']}
          onClick={form.handleSubmit(onSubmit)}
          type="submit"
          $size="md"
          $isLoading={form.formState.isSubmitting}
        >
          {selectedCount ? `Queue ${selectedCount} translations` : 'Queue translations'}
        </Button>
      </fieldset>
    </FormProvider>
  )
}
