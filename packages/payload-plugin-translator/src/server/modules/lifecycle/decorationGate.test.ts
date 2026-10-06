import { describe, expect, it } from "vitest";

import { needsDecoration } from "./withQueuedNotification.js";
import type { TranslationLifecycleCallbacks } from "./types.js";

const noop = (): void => undefined;

describe("needsDecoration — whether a host's callbacks require wrapping the runner", () => {
  it.each<[string, TranslationLifecycleCallbacks]>([
    ["onQueued alone", { onQueued: noop }],
    ["onCancelled alone", { onCancelled: noop }],
    ["both", { onQueued: noop, onCancelled: noop }],
  ])("wraps for %s", (_label, callbacks) => {
    expect(needsDecoration(callbacks)).toBe(true);
  });

  it.each<[string, TranslationLifecycleCallbacks]>([
    ["no callbacks at all", {}],
    ["only callbacks the handler fires itself", { onCompleted: noop }],
    ["only onFailed", { onFailed: noop }],
  ])("leaves the runner alone for %s", (_label, callbacks) => {
    expect(needsDecoration(callbacks)).toBe(false);
  });
});
