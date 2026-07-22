import { useId, useMemo, useState } from "react";
import { useController } from "react-hook-form";

import { useLocaleOptions } from "../../../lib/payload/hooks/useLocaleOptions";
import { Checkbox } from "../../Checkbox";
import Description from "../../Description";
import Label from "../../Label";
import Popup from "../../Popup";

import styles from "./styles.module.scss";

type FormMultiSelectLocaleProps = {
  name: string;
  required?: boolean;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  placeholder?: string;
};

/** Options above this count get a filter input in the popover header (progressive disclosure). */
const FILTER_THRESHOLD = 8;

/** Compact summary for the collapsed trigger: `-` / `de, fr +2` / `All (N)`. Ordered by option order
 * so it is stable regardless of the pick order the user clicked in. */
function summarize(selected: string[], orderedCodes: string[], total: number, placeholder: string) {
  if (selected.length === 0) return placeholder;
  if (selected.length >= total && total > 0) return `All (${total})`;
  const shown = orderedCodes.slice(0, 2).join(", ");
  const extra = orderedCodes.length - 2;
  return extra > 0 ? `${shown} +${extra}` : shown;
}

/**
 * Multi-select of target locales with a **fixed single-line trigger** — the multiplicity lives in a
 * popover of checkboxes, so the control never grows with the number of selected locales (it fits the
 * tight document panel identically to the single {@link FormSelectLocale}). Binds to a `string[]`
 * form value via `useController`, symmetric with `FormSelectLocale`'s `string` binding.
 */
export default function FormMultiSelectLocale({
  name,
  required,
  label,
  description,
  disabled,
  size = "sm",
  className,
  placeholder = "-",
}: FormMultiSelectLocaleProps) {
  const options = useLocaleOptions();
  const { field, fieldState, formState } = useController({ name, rules: { required } });
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const errorId = useId();
  const descriptionId = useId();

  const selected: string[] = Array.isArray(field.value) ? field.value : [];
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const orderedCodes = useMemo(
    () => options.filter((o) => selectedSet.has(o.value)).map((o) => o.value),
    [options, selectedSet]
  );

  const isDisabled = disabled || field.disabled || formState.disabled || formState.isSubmitting;
  const allSelected = options.length > 0 && selected.length >= options.length;

  const toggle = (value: string) => {
    const next = selectedSet.has(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    field.onChange(next);
  };
  const toggleAll = () => field.onChange(allSelected ? [] : options.map((o) => o.value));

  const visibleOptions =
    filter.trim().length > 0
      ? options.filter((o) => o.value.toLowerCase().includes(filter.trim().toLowerCase()))
      : options;

  const trigger = (
    <button
      type="button"
      className={`${styles.trigger} ${styles[`size-${size}`]} ${
        fieldState.invalid ? styles["trigger--error"] : ""
      }`}
      disabled={isDisabled}
      onBlur={field.onBlur}
      aria-invalid={fieldState.invalid}
      aria-describedby={errorId}
      aria-label={label ? undefined : "Select target languages"}
    >
      <span className={styles.summary}>
        {summarize(selected, orderedCodes, options.length, placeholder)}
      </span>
      <span aria-hidden className={styles.caret}>
        ▾
      </span>
    </button>
  );

  const control = (
    <Popup open={open && !isDisabled} onOpenChange={setOpen} $trigger={trigger} $align="start">
      <div className={styles.menu}>
        {options.length > FILTER_THRESHOLD && (
          <input
            className={styles.filter}
            type="text"
            value={filter}
            placeholder="Filter…"
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter languages"
          />
        )}
        <label className={styles.option}>
          <Checkbox checked={allSelected} onChange={toggleAll} aria-label="Select all languages" />
          <span className={styles.optionLabel}>Select all</span>
        </label>
        <div className={styles.divider} role="separator" />
        {visibleOptions.map((option) => (
          <label key={option.value} className={styles.option}>
            <Checkbox
              checked={selectedSet.has(option.value)}
              onChange={() => toggle(option.value)}
            />
            <span className={styles.optionCode}>{option.value}</span>
            {option.label !== option.value && (
              <span className={styles.optionLabel}>{option.label}</span>
            )}
          </label>
        ))}
      </div>
    </Popup>
  );

  const errorNode = fieldState.error && (
    <Description variant="error" id={errorId}>
      {fieldState.error.message}
    </Description>
  );
  const descNode = description && <Description id={descriptionId}>{description}</Description>;

  if (!label) {
    return (
      <div className={className}>
        {control}
        {errorNode}
        {descNode}
      </div>
    );
  }
  return (
    <Label className={className} label={label} $size={size}>
      {control}
      {errorNode}
      {descNode}
    </Label>
  );
}
