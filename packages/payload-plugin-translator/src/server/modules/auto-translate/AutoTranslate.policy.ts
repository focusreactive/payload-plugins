import type { CollectionSlug } from "payload";

import type { AutoTranslateConfig } from "../../../core/domain/auto-translate/index.js";
import { Locales } from "../../../core/domain/locales/index.js";
import type { TaskInput } from "../task-runner/types.js";

export type NormalizedAutoTranslatePolicy = {
  targets: string[];
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

/** De-duplicates `targets`: a misconfigured `["de","de"]` would enqueue two racing jobs for one
 * (document, locale) — the runner's supersession only dedupes against already-stored jobs. */
export function normalizeAutoTranslateConfig(
  config: AutoTranslateConfig
): NormalizedAutoTranslatePolicy {
  return {
    targets: Locales.dedupe(config.targets),
    debounceMs: config.debounceMs ?? 0,
    sourceLocale: config.sourceLocale,
  };
}

type PolicyLocaleFilter = {
  policy: NormalizedAutoTranslatePolicy;
  droppedTargets: string[];
  droppedSourceLocale: string | null;
};

/**
 * Drop targets (and a `sourceLocale` override) that are not configured locales, so a mistyped locale in
 * `withAutoTranslate` never reaches the pipeline — where it would silently burn a provider call and
 * either error at the DB (Postgres locale enum) or write orphaned, invisible data (Mongo/SQLite). Pure:
 * returns a new policy and reports the drops; the caller (config-time wiring) emits the warning.
 */
export function filterPolicyToKnownLocales(
  policy: NormalizedAutoTranslatePolicy,
  knownLocales: Set<string>
): PolicyLocaleFilter {
  const { kept, dropped } = Locales.dropUnknown(policy.targets, knownLocales);
  const sourceUnknown =
    policy.sourceLocale !== undefined && !Locales.isKnown(policy.sourceLocale, knownLocales);
  return {
    policy: {
      ...policy,
      targets: kept,
      sourceLocale: sourceUnknown ? undefined : policy.sourceLocale,
    },
    droppedTargets: dropped,
    droppedSourceLocale: sourceUnknown ? (policy.sourceLocale ?? null) : null,
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
 * Whether the translation itself is published. A separate name from {@link passesPublishGate}, which
 * answers whether to translate at all: the two give the same answer only while nothing can translate
 * a still-draft source.
 */
function resolvePublishOnTranslation(doc: Record<string, unknown>, hasDrafts: boolean): boolean {
  return passesPublishGate(doc, hasDrafts);
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
  return Locales.excludeSource(policy.targets, sourceLocale).kept.map((target) => ({
    collectionSlug,
    collectionId: documentId,
    sourceLng: sourceLocale,
    targetLng: target,
    publishOnTranslation,
    waitUntil,
  }));
}
