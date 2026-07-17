import type { CollectionSlug } from "payload";

import type { AutoTranslateConfig } from "../../../core/auto-translate-config";
import type { TaskInput } from "../task-runner/types";

/** A collection's auto-translate rule with defaults resolved — the shape the hook consumes. */
export type NormalizedAutoTranslatePolicy = {
  targets: string[];
  strategy: "overwrite" | "skip_existing";
  debounceMs: number;
  sourceLocale?: string;
};

/**
 * Resolve the effective auto-translate policy for a document, or `null` when off. The `doc` parameter
 * is the reserved seam for the future document-level manager override (#51 D7): v1 resolves at the
 * collection level and IGNORES `doc`; a later phase supplies a second implementation that consults the
 * document, without changing the hook, drift-gate, debounce, or wiring.
 */
export type AutoTranslatePolicyResolver = (
  collectionSlug: string,
  doc: Record<string, unknown>
) => NormalizedAutoTranslatePolicy | null;

/** Apply defaults to a raw config: strategy → "overwrite", debounce → 0. Duplicate target locales are
 * de-duplicated so a misconfigured `targets: ["de","de"]` never enqueues two racing jobs for the same
 * (document, locale) in one batch (the runner's supersession only dedupes against already-stored jobs). */
export function normalizeAutoTranslateConfig(
  config: AutoTranslateConfig
): NormalizedAutoTranslatePolicy {
  return {
    targets: [...new Set(config.targets)],
    strategy: config.strategy ?? "overwrite",
    debounceMs: config.debounceMs ?? 0,
    sourceLocale: config.sourceLocale,
  };
}

/**
 * The v1 (collection-level) resolver. Ignores `doc` — see {@link AutoTranslatePolicyResolver}. This is
 * the single seam a future document-level manager replaces.
 */
export function makeCollectionPolicyResolver(
  policies: Map<string, NormalizedAutoTranslatePolicy>
): AutoTranslatePolicyResolver {
  return (collectionSlug, _doc) => policies.get(collectionSlug) ?? null;
}

/**
 * Publish-gate (#51 D8): a drafts-enabled collection auto-translates only on a **published** save;
 * autosave/draft saves are ignored. A collection without drafts has no `_status`, so every save
 * qualifies. Applies uniformly to create and update.
 */
export function passesPublishGate(doc: Record<string, unknown>, hasDrafts: boolean): boolean {
  if (!hasDrafts) return true;
  return doc._status === "published";
}

/**
 * Mirror the source document's status onto the translation (#51 D9). Combined with the publish-gate,
 * the source is published whenever we reach enqueue, so translations publish; a no-drafts collection
 * publishes too. Deliberately identical to {@link passesPublishGate} today — kept as a SEPARATE
 * function (not merged) because it diverges once a future document-level manager (R8) can bypass the
 * gate and translate a still-draft source; do not collapse the two.
 */
export function resolvePublishOnTranslation(
  doc: Record<string, unknown>,
  hasDrafts: boolean
): boolean {
  if (!hasDrafts) return true;
  return doc._status === "published";
}

/**
 * Build one {@link TaskInput} per configured target locale (the source locale is always excluded).
 * `waitUntil` encodes the debounce; `now` is injected so the timestamp is deterministic in tests.
 */
export function buildAutoTranslateTasks(args: {
  policy: NormalizedAutoTranslatePolicy;
  collectionSlug: CollectionSlug;
  documentId: string;
  sourceLocale: string;
  doc: Record<string, unknown>;
  hasDrafts: boolean;
  now: number;
}): TaskInput[] {
  const { policy, collectionSlug, documentId, sourceLocale, doc, hasDrafts, now } = args;
  const publishOnTranslation = resolvePublishOnTranslation(doc, hasDrafts);
  const waitUntil = policy.debounceMs > 0 ? new Date(now + policy.debounceMs) : undefined;
  return policy.targets
    .filter((target) => target !== sourceLocale)
    .map((target) => ({
      collectionSlug,
      collectionId: documentId,
      sourceLng: sourceLocale,
      targetLng: target,
      strategy: policy.strategy,
      publishOnTranslation,
      waitUntil,
    }));
}
