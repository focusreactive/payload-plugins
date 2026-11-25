import type { EnqueueListRequest } from "../../../../types/wire/ActionBodies.js";
import type { ListTranslationState } from "../../../../types/wire/ListTranslationState.js";
import type { DocumentId, LocaleCode } from "../../../../types/wire/primitives.js";
import { hasLiveRun } from "./documentPanelStatus.js";
import type { CollectionSlug } from "./TranslationRepository.js";

export type Batch = { queue: readonly DocumentId[]; skipped: readonly DocumentId[] };

/** Unknown until the list state is read: then nothing is marked, and the server answers `busy`. */
export function liveDocumentsOf(state: ListTranslationState | undefined): ReadonlySet<DocumentId> {
  const live = (state?.docs ?? []).filter(({ locales }) => hasLiveRun(locales));
  return new Set(live.map(({ id }) => id));
}

export function batchOf(
  selected: readonly DocumentId[],
  removed: ReadonlySet<DocumentId>,
  live: ReadonlySet<DocumentId>
): Batch {
  const kept = selected.filter((id) => !removed.has(id));
  return {
    queue: kept.filter((id) => !live.has(id)),
    skipped: kept.filter((id) => live.has(id)),
  };
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function batchSummary(documents: number, locales: number): string {
  if (documents === 0 || locales === 0) {
    return "Nothing will be queued — choose a document and a locale.";
  }
  const translations = documents * locales;
  return (
    `${plural(translations, "translation", "translations")} will be queued — ` +
    `${plural(documents, "document", "documents")} into ${plural(locales, "locale", "locales")}.`
  );
}

type CollectionEnqueue = {
  collection: CollectionSlug;
  source: LocaleCode;
  targets: readonly LocaleCode[];
  documents: readonly DocumentId[];
  onlyBehind: boolean;
};

/** A manual run saves drafts, so it never asks to publish. */
export function collectionEnqueue({
  collection,
  source,
  targets,
  documents,
  onlyBehind,
}: CollectionEnqueue): EnqueueListRequest | null {
  const [first, ...rest] = documents;
  if (first === undefined || targets.length === 0) return null;
  return {
    source_lng: source,
    target_lng: [...targets],
    collection_slug: collection,
    collection_id: [first, ...rest],
    ...(onlyBehind ? { filters: [{ kind: "rule", name: "stale" }] } : {}),
  };
}
