import { RunTargetSchema } from "./jobInput.schema.js";
import type { StoredInput, StoredRunTarget } from "./types.js";

/**
 * Spelled, not imported: `store/` must not depend on the optional provenance module. Must equal its
 * `DRIFT_CRITERION` — see docs/DEPRECATIONS.md#the-strategy-leaves-the-stored-run.
 */
const DRIFT_CRITERION = "stale";

/**
 * `skip_existing` becomes the drift rule — the nearest meaning, not the same one: an empty target
 * whose source stands still is no longer filled. Anything else becomes no filter at all.
 *
 * @deprecated See docs/DEPRECATIONS.md#the-strategy-leaves-the-stored-run
 */
const legacyRunTargets = (input: StoredInput): StoredRunTarget[] => {
  if (!Array.isArray(input.target_lngs)) return [];

  const filters: StoredRunTarget["filters"] =
    input.strategy === "skip_existing" ? [{ kind: "rule", name: DRIFT_CRITERION }] : [];
  return input.target_lngs.map((lng) => ({ lng, filters }));
};

/**
 * A run's target locales, reading a row written in either shape.
 *
 * An entry the parser rejects is dropped rather than read as naming no filter: an unreadable entry
 * says nothing about what its locale was meant to translate, and reading it as `[]` would turn a
 * narrowed run into one that overwrites the whole target document.
 */
export function runTargets(input: StoredInput | undefined): StoredRunTarget[] {
  if (Array.isArray(input?.targets)) {
    return input.targets.flatMap((entry) => {
      const parsed = RunTargetSchema.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    });
  }
  return input ? legacyRunTargets(input) : [];
}

export const runLocales = (input: StoredInput | undefined): string[] =>
  runTargets(input).map((target) => target.lng);
