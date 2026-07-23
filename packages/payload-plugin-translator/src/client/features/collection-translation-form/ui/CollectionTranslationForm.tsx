import { useEffect, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { FormProvider } from "react-hook-form";

import { SendIcon } from "../../../shared/lib/assets/icons/SendIcon";
import type { TargetSelectionMode } from "../../../../types/TargetSelection";
import { pruneSourceFromTarget } from "../../../shared/lib/forms/pruneSourceFromTarget";
import { useLocaleOptions } from "../../../shared/lib/payload/hooks/useLocaleOptions";
import Button from "../../../shared/ui/Button";
import FormSelect from "../../../shared/ui/form/FormSelect";
import FormMultiSelect from "../../../shared/ui/form/FormMultiSelect";
import { FormSelectStrategy } from "../../../shared/ui/form/FormSelectStrategy";
import { FormCheckboxPublish } from "../../../shared/ui/form/FormCheckboxPublish";

import { FORM_FIELDS } from "../model/constants";
import type { FormValues } from "../model/schema";
import styles from "./styles.module.scss";

type CollectionTranslationFormProps = {
  form: UseFormReturn<FormValues>;
  onSubmit: (values: FormValues) => Promise<void>;
  selectedCount: number;
  hasDrafts: boolean;
  targetSelection: TargetSelectionMode;
};

export function CollectionTranslationForm({
  form,
  onSubmit,
  selectedCount,
  hasDrafts,
  targetSelection,
}: CollectionTranslationFormProps) {
  const localeOptions = useLocaleOptions();
  const source = form.watch(FORM_FIELDS.SOURCE_LNG);

  const targetOptions = useMemo(
    () => localeOptions.filter((option) => option.value !== source),
    [localeOptions, source]
  );

  useEffect(() => {
    const pruned = pruneSourceFromTarget(form.getValues(FORM_FIELDS.TARGET_LNG), source);
    if (pruned !== null) {
      form.setValue(FORM_FIELDS.TARGET_LNG, pruned, { shouldValidate: false });
    }
  }, [source, form]);

  return (
    <FormProvider {...form}>
      <fieldset className={styles.fieldset}>
        <div className={styles.row}>
          <FormSelect
            size="sm"
            label="From"
            name={FORM_FIELDS.SOURCE_LNG}
            options={localeOptions}
            placeholder="-"
          />
          {targetSelection === "multi" ? (
            <FormMultiSelect
              size="sm"
              label="To"
              name={FORM_FIELDS.TARGET_LNG}
              options={targetOptions}
            />
          ) : (
            <FormSelect
              size="sm"
              label="To"
              name={FORM_FIELDS.TARGET_LNG}
              options={targetOptions}
              placeholder="-"
            />
          )}
        </div>
        <FormSelectStrategy size="sm" name={FORM_FIELDS.STRATEGY} />
        {hasDrafts && <FormCheckboxPublish name={FORM_FIELDS.PUBLISH_ON_TRANSLATION} />}
        <input {...form.register(FORM_FIELDS.HIDDEN_COLLECTION_SLUG)} type="hidden" />
        <Button
          $variant="filled"
          disabled={form.formState.isSubmitting || selectedCount === 0}
          className={styles["submit-button"]}
          onClick={form.handleSubmit(onSubmit)}
          type="submit"
          $size="sm"
          $isLoading={form.formState.isSubmitting}
          $startContent={<SendIcon />}
        >
          {selectedCount ? `Queue ${selectedCount} translations` : "Queue translations"}
        </Button>
        {selectedCount === 0 && (
          <p className={styles.caption}>Select rows in the list to translate.</p>
        )}
      </fieldset>
    </FormProvider>
  );
}
