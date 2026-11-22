import type { World } from "../../../core/domain/world/index.js";

export type PublishScope = {
  publishSpecificLocale: string;
  /**
   * Merged into the published write's data. Looks redundant beside `publishSpecificLocale`
   * and is not: without it, any other locale holding a pending draft drags the whole
   * document back to `draft` (#102).
   */
  status: "published";
};

/**
 * Where a translation is written, and — separately — how the locale is published afterwards.
 *
 * A union, not one shape with optional fields: `publishSpecificLocale` on a collection with
 * versions but no drafts drops every other locale from the live row (Payload 3.84.1, silent).
 * `publish` exists only on the `drafts` variant, so that pair is unbuildable — see
 * `targetLayer.contract.test.ts`.
 */
export type TargetLayer =
  | {
      kind: "no-drafts";
      write: { autosave: false };
    }
  | {
      kind: "drafts";
      write: { draft: true; autosave: boolean };
      publish: PublishScope;
    };

export type WriteLayer = TargetLayer["write"];

export function layerOf(world: World<unknown>, targetLng: string): TargetLayer {
  if (world.kind === "single-layer") return { kind: "no-drafts", write: { autosave: false } };

  return {
    kind: "drafts",
    write: { draft: true, autosave: world.autosave },
    publish: { publishSpecificLocale: targetLng, status: "published" },
  };
}
