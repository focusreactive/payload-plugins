import type { EnqueueRequest } from "../../../../types/wire/ActionBodies.js";
import type { LeafAddress, LocaleCode } from "../../../../types/wire/primitives.js";
import type { DocumentAddress } from "./TranslationRepository.js";

/** How much of each target locale a run translates. `behind`: what the server finds out of date. */
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

function filtersOf(scope: TranslationScope): Pick<EnqueueRequest, "filters"> {
  if (scope.kind === "leaves")
    return { filters: [{ kind: "leaves", addresses: [...scope.addresses] }] };
  if (scope.kind === "behind") return { filters: [{ kind: "rule", name: "stale" }] };
  return {};
}

/** A manual run of one document; it saves drafts, so it never asks to publish. */
export function documentEnqueue({
  document,
  source,
  targets,
  scope,
}: DocumentEnqueue): EnqueueRequest {
  return {
    source_lng: source,
    target_lng: [...targets],
    collection_slug: document.collection,
    collection_id: [document.id],
    ...filtersOf(scope),
  };
}
