/**
 * `fingerprint` — a stable, reorder-invariant hash of a content projection (slice 6 design,
 * `docs/plans/2026-06-30-slice6-contentprojector-idpath-design.md`). It is the roll-up the
 * provenance staleness check compares over time: `CURRENT = fingerprint(projectTranslatableContent(
 * sourceDoc, schema))`.
 *
 * Entries are sorted by `idPath` before hashing, so reordering array/blocks elements (which keeps
 * the same `{ idPath, text }` set) does not move the hash — only a real content change does. The
 * key and the value are length-prefixed so no shift of the text/key boundary can alias two
 * different projections onto the same serialization.
 *
 * Depends only on `node:crypto` (a node built-in) — payload-free, so it can move to
 * `@repo/translator-core` unchanged.
 */

import { createHash } from "node:crypto";
import type { IdPath } from "./idPath";

interface ProjectionEntry {
  idPath: IdPath;
  text: string;
}

const serializeEntry = (entry: ProjectionEntry): string =>
  `${entry.idPath.length}:${entry.idPath}=${entry.text.length}:${entry.text}`;

/**
 * Hash a projection into a hex sha256 digest. Order-independent (sorted by `idPath` first) and
 * deterministic.
 *
 * @param projection - The `{ idPath, text }` entries from {@link projectTranslatableContent}.
 * @returns A hex sha256 string; equal projections (same entries, any order) hash equally.
 */
export function fingerprint(projection: ProjectionEntry[]): string {
  const serialized = [...projection]
    .sort((a, b) => (a.idPath < b.idPath ? -1 : a.idPath > b.idPath ? 1 : 0))
    .map(serializeEntry)
    .join("\n");

  return createHash("sha256").update(serialized).digest("hex");
}
