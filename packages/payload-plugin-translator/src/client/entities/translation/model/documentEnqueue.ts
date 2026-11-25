import type { EnqueueDocumentRequest } from "../../../../types/wire/ActionBodies.js";
import type { LeafAddress, LocaleCode } from "../../../../types/wire/primitives.js";
import type { DocumentAddress } from "./TranslationRepository.js";

export type TranslationScope =
  | { kind: "whole" }
  | { kind: "leaves"; addresses: readonly LeafAddress[] }
  | { kind: "behind" };

type DocumentEnqueue = {
  document: DocumentAddress;
  source: LocaleCode;
  targets: readonly LocaleCode[];
  scope: TranslationScope;
};

function filtersOf(scope: TranslationScope): Pick<EnqueueDocumentRequest, "filters"> {
  if (scope.kind === "leaves")
    return { filters: [{ kind: "leaves", addresses: [...scope.addresses] }] };
  if (scope.kind === "behind") return { filters: [{ kind: "rule", name: "stale" }] };
  return {};
}

export function documentEnqueue({
  document,
  source,
  targets,
  scope,
}: DocumentEnqueue): Omit<EnqueueDocumentRequest, "publish_on_translation"> {
  return {
    source_lng: source,
    target_lng: [...targets],
    collection_slug: document.collection,
    collection_id: [document.id],
    ...filtersOf(scope),
  };
}
