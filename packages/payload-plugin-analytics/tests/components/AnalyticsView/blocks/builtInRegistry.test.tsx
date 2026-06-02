import { describe, expect, it } from "vitest";
import { BUILTIN_BLOCK_COMPONENTS } from "../../../../src/components/AnalyticsView/blocks/builtInRegistry";
import { BUILTIN_OVERVIEW_BLOCK_IDS, BUILTIN_LEAD_ACTIONS_BLOCK_IDS } from "../../../../src/constants/layout";

describe("BUILTIN_BLOCK_COMPONENTS", () => {
  it("has a function component for every built-in block ID", () => {
    for (const id of [...BUILTIN_OVERVIEW_BLOCK_IDS, ...BUILTIN_LEAD_ACTIONS_BLOCK_IDS]) {
      expect(typeof BUILTIN_BLOCK_COMPONENTS[id]).toBe("function");
    }
  });
});
