import classNames from "classnames";
import type { ComponentPropsWithRef, CSSProperties } from "react";
import { forwardRef, useState } from "react";

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

/**
 * Props mirror the single `Select` (`ComponentPropsWithRef<"button">` + the same custom `$`-prefixed
 * knobs), except `value`/`onChange` are omitted from the button props and redefined for a multi
 * selection (a native `<button>` has a `string` value + a form `onChange`, incompatible with these).
 */
type MultiSelectProps = Omit<ComponentPropsWithRef<"button">, "value" | "onChange" | "onBlur"> & {
  /** Selected option values (controlled). */
  value: string[];
  /** Next selection whenever the user toggles an option or "select all". */
  onChange: (value: string[]) => void;
  /**
   * Fired when the popover CLOSES (the field is "done"), not when the trigger loses focus — opening
   * the popover moves focus into it, and firing blur then would mark the field touched before the
   * user has picked anything (premature `onTouched` validation).
   */
  onBlur?: () => void;
  options: MultiSelectOption[];
  /** Shown on the trigger when nothing is selected. */
  placeholder?: string;
  hasError?: boolean;
  $size?: "sm" | "md" | "lg";
  /** Stretch to fill the container (default). Set `false` to size to content. */
  $fullWidth?: boolean;
  /** Label for the "select all" row. */
  selectAllLabel?: string;
  /** Show a filter input in the popover once the option count exceeds this. */
  filterThreshold?: number;
};

// Same size ramp as the single Select, driven through CSS custom properties so both controls collapse
// to an identical footprint.
const sizes = {
  sm: { height: "24px", paddingInline: "0.5rem", fontSize: "0.875rem" },
  md: { height: "32px", paddingInline: "0.5rem", fontSize: "1rem" },
  lg: { height: "40px", paddingInline: "0.75rem", fontSize: "1rem" },
};

/**
 * A controlled multi-select whose collapsed trigger is a `<button>` styled identically to the single
 * `Select` (same border, chevron, focus ring, error + disabled states, size ramp). The multiplicity
 * lives in a checkbox popover with a "select all" row and a progressive filter — the trigger shows a
 * compact summary (`de, fr +2` / `All (N)`) and never grows with the selection. All decision logic
 * lives in `./multiSelectModel`; the popover width tracks the trigger and grows to its content.
 */
const MultiSelect = forwardRef<HTMLButtonElement, MultiSelectProps>(function MultiSelect(
  {
    value,
    onChange,
    onBlur,
    options,
    placeholder = "-",
    hasError = false,
    $size = "lg",
    $fullWidth = true,
    selectAllLabel = "Select all",
    filterThreshold = 8,
    className = "",
    disabled,
    style,
    "aria-invalid": ariaInvalid,
    ...rest
  },
  ref
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // No options to choose → nothing the popover can do; present as disabled (mirrors an empty select).
  const isDisabled = Boolean(disabled) || options.length === 0;
  const selected = new Set(value);
  const allSelected = isAllSelected(value, options);
  const showFilter = options.length > filterThreshold;
  const visibleOptions = showFilter ? filterOptions(options, query) : options;

  const _style: CSSProperties = {
    "--height": sizes[$size].height,
    "--padding-inline": sizes[$size].paddingInline,
    "--font-size": sizes[$size].fontSize,
    ...style,
  } as CSSProperties;

  const triggerClassName = classNames(
    styles.trigger,
    styles[`size-${$size}`],
    { [styles.triggerError]: hasError, [styles.auto]: !$fullWidth },
    className
  );

  const trigger = (
    <button
      ref={ref}
      type="button"
      className={triggerClassName}
      style={_style}
      disabled={isDisabled}
      aria-invalid={ariaInvalid ?? hasError}
      {...rest}
    >
      <span className={styles.summary}>{summarizeSelection(value, options, placeholder)}</span>
    </button>
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // Popover closed → the user is done with the field; only now mark it touched.
    if (!next) onBlur?.();
  };

  return (
    <Popup
      open={open && !isDisabled}
      onOpenChange={handleOpenChange}
      $trigger={trigger}
      $align="start"
    >
      <div className={styles.menu} role="group" aria-label={selectAllLabel}>
        {showFilter && (
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
});

export default MultiSelect;
