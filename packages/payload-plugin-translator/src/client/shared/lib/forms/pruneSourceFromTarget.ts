/**
 * Remove the source locale from a target-field value so a target can never equal the source. Handles
 * both the single (`string`) and multi (`string[]`) target shapes. Returns the pruned value, or `null`
 * when nothing needed pruning — the caller then skips the form write to avoid a redundant update (and
 * the re-render / validation it would trigger).
 */
export function pruneSourceFromTarget(
  value: string | string[],
  source: string
): string | string[] | null {
  if (Array.isArray(value)) {
    const filtered = value.filter((locale) => locale !== source);
    return filtered.length === value.length ? null : filtered;
  }
  return value === source ? "" : null;
}
