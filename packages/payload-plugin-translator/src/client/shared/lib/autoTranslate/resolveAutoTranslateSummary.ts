import { getAutoTranslateConfig } from "../../../../core/auto-translate-config";

/** The auto-translate facts the Automation panel renders — resolved from a collection's opt-in config. */
export type AutoTranslateSummary = { targets: string[]; sourceLocale: string };

/**
 * Resolve a collection's auto-translate summary for the Automation panel, or `null` when it should not
 * render. Reads the opt-in from the collection's `custom` (propagated onto the registered collection at
 * init), resolves the source locale (per-collection override else the config default), and drops the
 * source from the displayed targets. Returns `null` when off, when no source locale is resolvable, or
 * when no target remains — so the caller renders the panel only when it is both enabled and meaningful.
 */
export function resolveAutoTranslateSummary(
  collection: { custom?: Record<string, unknown> } | undefined,
  defaultLocale: string | undefined
): AutoTranslateSummary | null {
  if (!collection) return null;
  const config = getAutoTranslateConfig(collection);
  if (!config) return null;
  const sourceLocale = config.sourceLocale ?? defaultLocale;
  if (!sourceLocale) return null;
  const targets = config.targets.filter((target) => target !== sourceLocale);
  if (targets.length === 0) return null;
  return { targets, sourceLocale };
}
