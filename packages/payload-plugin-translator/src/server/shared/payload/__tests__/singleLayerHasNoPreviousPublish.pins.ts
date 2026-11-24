/** Never imported and never run: `check-types` fails if any `@ts-expect-error` below stops being an error. */

import type { CollectionWorld } from "../worldOfCollection.js";

type Layered = Extract<CollectionWorld, { kind: "layered" }>;
type SingleLayer = Extract<CollectionWorld, { kind: "single-layer" }>;

declare const anyWorld: CollectionWorld;
declare const layered: Layered;
declare const singleLayer: SingleLayer;

// @ts-expect-error a world nobody has narrowed cannot be asked for the publish before this one
const _baselineOfAnyWorld = anyWorld.previousPublished;

// @ts-expect-error a collection with no published layer has no previous publish, not an empty one
const _baselineOfSingleLayer = singleLayer.previousPublished;

// Two positive controls. Without the first, a field that stopped resolving would satisfy both
// directives above; without the second, a `SingleLayer` that collapsed to `never` would satisfy the
// second directive for the wrong reason, since every property access on `never` is an error.
export const baselineOfLayered: Layered["previousPublished"] = layered.previousPublished;
export const kindOfSingleLayer: "single-layer" = singleLayer.kind;
