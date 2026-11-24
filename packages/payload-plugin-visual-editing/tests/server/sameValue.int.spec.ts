import { describe, expect, it } from "vitest";

import { isLeftAsItWas } from "../../src/server/fieldEdit/fieldEditEndpoint";
import { isSameValue } from "../../src/shared/sameValue";

const state = (text: string) => ({
  root: { children: [{ text, type: "text", version: 1 }], type: "root", version: 1 },
});

const stateWithKeysInAnotherOrder = (text: string) => ({
  root: { version: 1, type: "root", children: [{ version: 1, type: "text", text }] },
});

describe("two values compared by what they hold", () => {
  it.each([
    [
      { a: 1, b: [1, { c: null }] },
      { b: [1, { c: null }], a: 1 },
    ],
    [[], []],
    [null, null],
    ["a", "a"],
  ])("are the same whatever the order of their keys: %j", (one, other) => {
    expect(isSameValue(one, other)).toBe(true);
  });

  it.each([
    [{ a: 1 }, { a: 1, b: undefined }],
    [{ a: 1 }, { a: "1" }],
    [
      [1, 2],
      [2, 1],
    ],
    [[1], { 0: 1 }],
    [null, undefined],
    [{}, null],
  ])("differ: %j and %j", (one, other) => {
    expect(isSameValue(one, other)).toBe(false);
  });
});

describe("a save that left the field as it was", () => {
  it("is not seen in an edit that ends equal to the stored value, whatever order the database keeps its keys in", () => {
    const stored = { body: stateWithKeysInAnotherOrder("Same") };
    const sent = { body: state("Same") };

    expect(isLeftAsItWas(stored, stored, sent, "body")).toBe(false);
  });

  it("is seen when another state was sent and the stored one stayed", () => {
    const stored = { body: stateWithKeysInAnotherOrder("Kept") };

    expect(isLeftAsItWas(stored, { body: state("Kept") }, { body: state("Sent") }, "body")).toBe(
      true
    );
  });

  it("is not seen when the stored state changed", () => {
    const stored = { body: state("Before") };
    const saved = { body: stateWithKeysInAnotherOrder("Sent") };

    expect(isLeftAsItWas(stored, saved, { body: state("Sent") }, "body")).toBe(false);
  });
});
