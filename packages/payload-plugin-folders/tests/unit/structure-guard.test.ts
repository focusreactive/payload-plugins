import { describe, expect, it } from "vitest";

import {
  classifyStructureEdit,
  namesOtherFolder,
  namesOtherOrderKey,
} from "../../src/core/structureGuard.js";

const base = {
  changesStructure: true,
  incomingRevision: 2,
  missingRevisionIsStale: true,
  storedRevision: 2,
};

describe("classifyStructureEdit", () => {
  it("lets a write that changes no structure through", () => {
    expect(classifyStructureEdit({ ...base, changesStructure: false })).toBe("none");
  });

  it("calls a change at the stored revision deliberate", () => {
    expect(classifyStructureEdit(base)).toBe("deliberate");
    expect(classifyStructureEdit({ ...base, incomingRevision: "2" })).toBe("deliberate");
  });

  it("calls a change with an older revision stale", () => {
    expect(classifyStructureEdit({ ...base, incomingRevision: 1 })).toBe("stale");
  });

  it("treats a newer revision as deliberate, because only the move core can have set it", () => {
    expect(classifyStructureEdit({ ...base, incomingRevision: 3 })).toBe("deliberate");
  });

  it("decides a missing revision by the caller's policy", () => {
    expect(classifyStructureEdit({ ...base, incomingRevision: undefined })).toBe("stale");
    expect(classifyStructureEdit({ ...base, incomingRevision: null })).toBe("stale");
    expect(
      classifyStructureEdit({ ...base, incomingRevision: undefined, missingRevisionIsStale: false })
    ).toBe("deliberate");
  });
});

describe("structure comparisons", () => {
  it("names another folder when the id differs, the reference is invalid, or one side is the top level", () => {
    expect(namesOtherFolder({ id: 4, invalid: false }, 4)).toBe(false);
    expect(namesOtherFolder({ id: "4", invalid: false }, 4)).toBe(false);
    expect(namesOtherFolder({ id: 5, invalid: false }, 4)).toBe(true);
    expect(namesOtherFolder({ id: null, invalid: false }, 4)).toBe(true);
    expect(namesOtherFolder({ id: null, invalid: false }, null)).toBe(false);
    expect(namesOtherFolder({ id: null, invalid: true }, null)).toBe(true);
  });

  it("names another order key only when one is sent and differs", () => {
    expect(namesOtherOrderKey(undefined, "a0")).toBe(false);
    expect(namesOtherOrderKey("a0", "a0")).toBe(false);
    expect(namesOtherOrderKey("a1", "a0")).toBe(true);
    expect(namesOtherOrderKey(null, "a0")).toBe(true);
  });
});
