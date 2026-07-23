/** An option in a {@link MultiSelect} — same shape as the single `Select`'s option list. */
export type MultiSelectOption = { value: string; label: string };

/**
 * The selected values in option order, restricted to values that still exist in `options`. Using this
 * everywhere (display + counts) keeps the control stable when the selection holds a stale value that is
 * no longer a configured option — it is simply ignored rather than skewing the summary.
 */
export function orderedSelection(value: string[], options: MultiSelectOption[]): string[] {
  const selected = new Set(value);
  return options.filter((option) => selected.has(option.value)).map((option) => option.value);
}

/** True when every option is selected (and there is at least one option). */
export function isAllSelected(value: string[], options: MultiSelectOption[]): boolean {
  if (options.length === 0) return false;
  const selected = new Set(value);
  return options.every((option) => selected.has(option.value));
}

/** Toggle one value in/out of the selection, preserving the existing order (append on add). */
export function toggleValue(value: string[], option: string): string[] {
  return value.includes(option) ? value.filter((v) => v !== option) : [...value, option];
}

/** The next value for a "select all" toggle: clear when all are already selected, else select all. */
export function selectAllValue(value: string[], options: MultiSelectOption[]): string[] {
  return isAllSelected(value, options) ? [] : options.map((option) => option.value);
}

/**
 * Compact single-line trigger summary — `placeholder` when nothing is selected, `All (N)` when every
 * option is, otherwise up to two locale codes followed by a `+N` overflow (e.g. `de, fr +2`). Ordered
 * by option order so it never depends on the click order.
 */
export function summarizeSelection(
  value: string[],
  options: MultiSelectOption[],
  placeholder: string
): string {
  const selected = orderedSelection(value, options);
  if (selected.length === 0) return placeholder;
  if (isAllSelected(value, options)) return `All (${options.length})`;
  const shown = selected.slice(0, 2).join(", ");
  const extra = selected.length - 2;
  return extra > 0 ? `${shown} +${extra}` : shown;
}

/** Case-insensitive filter over option value + label; a blank/whitespace query returns all options. */
export function filterOptions(options: MultiSelectOption[], query: string): MultiSelectOption[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return options;
  return options.filter(
    (option) => option.value.toLowerCase().includes(q) || option.label.toLowerCase().includes(q)
  );
}
