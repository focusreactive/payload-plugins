import classNames from "classnames";
import { useState } from "react";

import { Checkbox } from "../Checkbox";
import Popup from "../Popup";

import {
  filterOptions,
  isAllSelected,
  selectAllValue,
  summarizeSelection,
  toggleValue,
} from "./multiSelectModel";
import type { MultiSelectOption } from "./multiSelectModel";
import styles from "./styles.module.scss";

export type { MultiSelectOption } from "./multiSelectModel";

type MultiSelectProps = {
  /** Selected option values (controlled). */
  value: string[];
  /** Called with the next selection whenever the user toggles an option or "select all". */
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  options: MultiSelectOption[];
  name?: string;
  /** Shown on the trigger when nothing is selected. */
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  $size?: "sm" | "md" | "lg";
  /** Stretch to fill the container (default). Set `false` to size to content. */
  $fullWidth?: boolean;
  /** Label for the "select all" row. */
  selectAllLabel?: string;
  /** Show a filter input in the popover once the option count exceeds this. */
  filterThreshold?: number;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

/**
 * A controlled multi-select with the same shape as the single `Select` (value/onChange/options/size/
 * hasError/disabled), plus the multi-select specifics: a **fixed single-line trigger** showing a
 * compact summary (`de, fr +2` / `All (N)`), a checkbox popover with a "select all" row, and a
 * progressive filter input for long option lists. The trigger never grows with the selection, so it
 * fits a tight panel identically to the single select. All decision logic lives in `./multiSelectModel`.
 */
export default function MultiSelect({
  value,
  onChange,
  onBlur,
  options,
  name,
  placeholder = "-",
  disabled = false,
  hasError = false,
  $size = "lg",
  $fullWidth = true,
  selectAllLabel = "Select all",
  filterThreshold = 8,
  className = "",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = new Set(value);
  const allSelected = isAllSelected(value, options);
  const visibleOptions = options.length > filterThreshold ? filterOptions(options, query) : options;

  const triggerClassName = classNames(
    styles.trigger,
    styles[`size-${$size}`],
    { [styles.triggerError]: hasError, [styles.auto]: !$fullWidth },
    className
  );

  const trigger = (
    <button
      type="button"
      name={name}
      className={triggerClassName}
      disabled={disabled}
      onBlur={onBlur}
      aria-invalid={ariaInvalid ?? hasError}
      aria-describedby={ariaDescribedby}
      aria-labelledby={ariaLabelledby}
      aria-label={ariaLabelledby ? undefined : (ariaLabel ?? "Select options")}
    >
      <span className={styles.summary}>{summarizeSelection(value, options, placeholder)}</span>
      <span aria-hidden className={styles.caret}>
        ▾
      </span>
    </button>
  );

  return (
    <Popup open={open && !disabled} onOpenChange={setOpen} $trigger={trigger} $align="start">
      <div className={styles.menu}>
        {options.length > filterThreshold && (
          <input
            className={styles.filter}
            type="text"
            value={query}
            placeholder="Filter…"
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Filter options"
          />
        )}
        <label className={styles.option}>
          <Checkbox
            checked={allSelected}
            onChange={() => onChange(selectAllValue(value, options))}
            aria-label={selectAllLabel}
          />
          <span className={styles.optionLabel}>{selectAllLabel}</span>
        </label>
        <div className={styles.divider} role="separator" />
        {visibleOptions.map((option) => (
          <label key={option.value} className={styles.option}>
            <Checkbox
              checked={selected.has(option.value)}
              onChange={() => onChange(toggleValue(value, option.value))}
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
}
