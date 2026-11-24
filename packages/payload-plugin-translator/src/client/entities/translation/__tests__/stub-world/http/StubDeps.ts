import type { StubWorld } from "../model/index.js";

/** What every stub handler reads: the one world, and the collections the plugin manages. */
export type StubDeps = {
  world: StubWorld;
  managed: ReadonlySet<string>;
};
