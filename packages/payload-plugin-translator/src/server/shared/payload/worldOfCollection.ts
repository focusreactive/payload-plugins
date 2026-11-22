import type { CollectionConfig, CollectionSlug, Payload } from "payload";
import { hasAutosaveEnabled, hasDraftsEnabled } from "payload/shared";

import type { World } from "../../../core/domain/world/index.js";
import { resolveWorld } from "../../../core/domain/world/index.js";

declare const minted: unique symbol;

export type VersionRead = {
  readonly draft: boolean;
  readonly fallbackLocale: false;
} & { readonly [minted]: true };

export type CollectionVersions = {
  readonly versions?: CollectionConfig["versions"];
};

const mintedRead = (draft: boolean): VersionRead =>
  ({ draft, fallbackLocale: false }) as VersionRead;

const READS = {
  latest: mintedRead(true),
  published: mintedRead(false),
} as const;

export function worldOfCollection(collection: CollectionVersions): World<VersionRead> {
  return resolveWorld(
    { drafts: hasDraftsEnabled(collection), autosave: hasAutosaveEnabled(collection) },
    READS
  );
}

const NOT_REGISTERED: CollectionVersions = {};

export const worldOfRegistered = (payload: Payload, slug: CollectionSlug): World<VersionRead> =>
  worldOfCollection(payload.collections[slug]?.config ?? NOT_REGISTERED);

/**
 * The read every fingerprint path is expected to take. Nothing enforces it: one brand covers both
 * reads, so a caller may hand `read.published` to `fetchDocumentLocale` instead.
 */
export const latestOf = (payload: Payload, slug: CollectionSlug): VersionRead =>
  worldOfRegistered(payload, slug).read.latest;
