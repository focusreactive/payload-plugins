/** Never imported and never run: `check-types` fails if any `@ts-expect-error` below stops being an error. */

import type { World } from "../world.js";

type Layered = Extract<World<string>, { kind: "layered" }>;
type SingleLayer = Extract<World<string>, { kind: "single-layer" }>;

declare const anyWorld: World<string>;
declare const layered: Layered;
declare const singleLayer: SingleLayer;

// @ts-expect-error a world nobody has narrowed cannot be asked for its published version
const _publishedOfAnyWorld = anyWorld.read.published;

// @ts-expect-error a single-layer world has no published version to ask for, not an empty one
const _publishedOfSingleLayer = singleLayer.read.published;

// The positive control: without it, a `read` that stopped resolving would satisfy both directives above.
export const publishedOfLayered: string = layered.read.published;
