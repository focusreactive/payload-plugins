import type { CollectionConfig, CollectionSlug, Payload, Where } from "payload";
import { hasAutosaveEnabled, hasDraftsEnabled, hasLocalizeStatusEnabled } from "payload/shared";

import type { World } from "../../../core/domain/world/index.js";
import { resolveWorld } from "../../../core/domain/world/index.js";
import type { DocumentId, LocaleCode } from "../../../types/wire/primitives.js";

import type { RequestScope } from "./RequestScope.shapes.js";
import { freshReq } from "./RequestScope.shapes.js";

declare const minted: unique symbol;

export type VersionRead = {
  readonly draft: boolean;
  readonly fallbackLocale: false;
} & { readonly [minted]: true };

export type CollectionVersions = {
  readonly versions?: CollectionConfig["versions"];
};

/** Why this plugin cannot serve a collection, in the sentence the refusal shows. */
export type UnsupportedWorld = string;

/** The experiments a host opts into, of which only this one changes what a version means. */
export type HostExperiments = {
  readonly localizeStatus?: boolean;
};

export type NamedCollection = CollectionVersions & { readonly slug: string };

/**
 * `null` when this plugin can serve the collection.
 *
 * Both halves of the condition are read because Payload clears a collection's own
 * `localizeStatus` while sanitizing the config whenever the host has not opted into the
 * experiment — and a plugin runs before that, so a caller holding the raw collection would
 * otherwise refuse a setting Payload is about to turn off.
 */
export const unsupportedWorldOf = (
  collection: NamedCollection,
  experiments: HostExperiments | undefined
): UnsupportedWorld | null => {
  if (!experiments?.localizeStatus || !hasLocalizeStatusEnabled(collection)) return null;

  return (
    `collection "${collection.slug}" enables \`versions.drafts.localizeStatus\`, which the ` +
    "translator cannot serve: it makes `_status` a value per locale, while the publish gate and " +
    "the comparison against the last publish both read one status for the document. Turn that " +
    "setting off for this collection, or stop passing the collection to the translator."
  );
};

const mintedRead = (draft: boolean): VersionRead =>
  ({ draft, fallbackLocale: false }) as VersionRead;

const READS = {
  latest: mintedRead(true),
  published: mintedRead(false),
} as const;

export type PreviousPublishedAsk = {
  payload: Payload;
  collection: CollectionSlug;
  id: DocumentId;
  locale: LocaleCode;
  scope: RequestScope;
};

const publishedRowsOf = (id: DocumentId): Where => ({
  and: [{ parent: { equals: id } }, { "version._status": { equals: "published" } }],
});

/**
 * The source text as the publish before this one left it, or `null` when there is none — a first
 * publish, or a history pruned past it.
 *
 * Two things the signature cannot say. Access control is overridden because the row is shown to
 * nobody: two fingerprints are compared inside the plugin, and the caller's right to the document
 * was settled by the save that is running. And `scope` must carry that save's transaction, because
 * the row for the save in flight is already written when the hook runs but is not yet committed —
 * it is the row this read skips to reach the one before it.
 */
const previousPublished = async (
  ask: PreviousPublishedAsk
): Promise<Record<string, unknown> | null> => {
  const { payload, collection, id, locale, scope } = ask;

  const history = await payload.findVersions({
    req: freshReq(scope),
    collection,
    where: publishedRowsOf(id),
    sort: "-updatedAt",
    limit: 2,
    locale,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });

  return history.docs[1]?.version ?? null;
};

type LayeredOf<Read> = Extract<World<Read>, { kind: "layered" }>;
type SingleLayerOf<Read> = Extract<World<Read>, { kind: "single-layer" }>;

/** The core world, widened here with the one read that needs Payload rather than an argument. */
export type CollectionWorld =
  | (LayeredOf<VersionRead> & {
      readonly previousPublished: (
        ask: PreviousPublishedAsk
      ) => Promise<Record<string, unknown> | null>;
    })
  | SingleLayerOf<VersionRead>;

export function worldOfCollection(collection: CollectionVersions): CollectionWorld {
  const world = resolveWorld(
    { drafts: hasDraftsEnabled(collection), autosave: hasAutosaveEnabled(collection) },
    READS
  );

  return world.kind === "single-layer" ? world : { ...world, previousPublished };
}

const NOT_REGISTERED: CollectionVersions = {};

export const worldOfRegistered = (payload: Payload, slug: CollectionSlug): CollectionWorld =>
  worldOfCollection(payload.collections[slug]?.config ?? NOT_REGISTERED);

export const latestOf = (payload: Payload, slug: CollectionSlug): VersionRead =>
  worldOfRegistered(payload, slug).read.latest;
