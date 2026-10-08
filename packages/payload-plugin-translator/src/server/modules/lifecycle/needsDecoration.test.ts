import { describe, expect, it } from "vitest";

import { needsDecoration } from "./needsDecoration.js";
import type { TranslationLifecycleCallbacks } from "./types.js";

const noop = (): void => undefined;

describe("needsDecoration", () => {
  it.each<[string, TranslationLifecycleCallbacks]>([
    ["onQueued", { onQueued: noop }],
    ["onCancelled", { onCancelled: noop }],
    ["both of them", { onQueued: noop, onCancelled: noop }],
    ["one of them beside a handler-raised one", { onCancelled: noop, onCompleted: noop }],
  ])("wraps for a host registering %s", (_label, callbacks) => {
    expect(needsDecoration(callbacks)).toBe(true);
  });

  it.each<[string, TranslationLifecycleCallbacks]>([
    ["nothing at all", {}],
    ["only onCompleted", { onCompleted: noop }],
    ["only onFailed", { onFailed: noop }],
    ["both handler-raised ones", { onCompleted: noop, onFailed: noop }],
  ])("does not wrap for a host registering %s", (_label, callbacks) => {
    expect(
      needsDecoration(callbacks),
      "the task handler reports these whether or not the runner is wrapped"
    ).toBe(false);
  });
});
