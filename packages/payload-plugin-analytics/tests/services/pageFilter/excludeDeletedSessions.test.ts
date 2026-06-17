// tests/services/pageFilter/excludeDeletedSessions.test.ts
import { describe, expect, it } from "vitest";
import { excludeDeletedSessions } from "../../../src/services/pageFilter/excludeDeletedSessions";

describe("excludeDeletedSessions", () => {
  const existing = new Set(["page:1", "page:2", "__home"]);

  it("keeps sessions whose every ref is in the existing set", () => {
    const sessionRefs = new Map([
      ["s1", new Set(["page:1", "__home"])],
      ["s2", new Set(["page:2"])],
    ]);
    expect([...excludeDeletedSessions(sessionRefs, existing)].sort()).toEqual(["s1", "s2"]);
  });

  it("drops a session that touched any non-existing ref (deleted page)", () => {
    const sessionRefs = new Map([
      ["s1", new Set(["page:1", "page:999"])], // 999 deleted
      ["s2", new Set(["page:2"])],
    ]);
    expect([...excludeDeletedSessions(sessionRefs, existing)]).toEqual(["s2"]);
  });

  it("drops a session that has an empty/absent ref (untracked hit)", () => {
    const sessionRefs = new Map([
      ["s1", new Set([""])],
      ["s2", new Set(["page:1"])],
    ]);
    expect([...excludeDeletedSessions(sessionRefs, existing)]).toEqual(["s2"]);
  });
});
