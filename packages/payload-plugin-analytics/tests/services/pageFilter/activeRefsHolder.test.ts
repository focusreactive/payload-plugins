// tests/services/pageFilter/activeRefsHolder.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import {
  setActiveExistingRefs,
  getActiveExistingRefs,
  __clearActiveExistingRefs,
} from "../../../src/services/pageFilter/activeRefsHolder";

describe("activeRefsHolder", () => {
  beforeEach(() => __clearActiveExistingRefs());

  it("returns an empty array before any set", () => {
    expect(getActiveExistingRefs()).toEqual([]);
  });

  it("stores and returns the most recent refs", () => {
    setActiveExistingRefs(["pages:1", "__home"]);
    expect(getActiveExistingRefs()).toEqual(["pages:1", "__home"]);
    setActiveExistingRefs(["pages:2"]);
    expect(getActiveExistingRefs()).toEqual(["pages:2"]);
  });
});
