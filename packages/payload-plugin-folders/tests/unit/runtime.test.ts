import type { Payload } from "payload";
import { describe, expect, it, vi } from "vitest";

import type { ResolvedOptions } from "../../src/types.js";

describe("the resolved options registry", () => {
  it("is shared by two copies of the module, as a Next.js app loads one per route layer", async () => {
    const payload = {} as Payload;
    const options = { maxDepth: 7 } as ResolvedOptions;

    vi.resetModules();
    const copyThatRegisters = await import("../../src/core/runtime.js");
    vi.resetModules();
    const copyThatReads = await import("../../src/core/runtime.js");
    expect(copyThatReads).not.toBe(copyThatRegisters);

    copyThatRegisters.registerResolvedOptions(payload, options);

    expect(copyThatReads.getResolvedOptions(payload)).toBe(options);
  });

  it("refuses a Payload instance the plugin never registered on", async () => {
    const { getResolvedOptions } = await import("../../src/core/runtime.js");

    expect(() => getResolvedOptions({} as Payload)).toThrow("not active");
  });
});
