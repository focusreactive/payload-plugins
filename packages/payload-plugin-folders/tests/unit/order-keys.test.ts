import { generateKeyBetween, generateNKeysBetween } from "payload/shared";
import { describe, expect, it } from "vitest";

import {
  compareSiblings,
  isUsableOrderKey,
  maxOrderKeyLength,
  planInsertKeys,
} from "../../src/core/orderKeys.js";
import type { SiblingRow } from "../../src/core/orderKeys.js";

const row = (
  id: number,
  orderKey: string | null,
  overrides: Partial<SiblingRow> = {}
): SiblingRow => ({
  collection: "pages",
  createdAt: "2026-01-01T00:00:00.000Z",
  id,
  kind: "page",
  orderKey,
  ...overrides,
});

const sortedIds = (rows: SiblingRow[]): number[] =>
  [...rows].sort(compareSiblings).map((sibling) => sibling.id as number);

/** Applies a plan the way the database layer does and returns the resulting order of ids. */
const applyPlan = (siblings: SiblingRow[], gap: number, count: number): number[] => {
  const plan = planInsertKeys({ count, gap, siblings });
  const rewritten = new Map(
    plan.rewrites.map(({ orderKey, row: sibling }) => [sibling.id, orderKey])
  );
  const keyed = siblings.map((sibling) => ({
    ...sibling,
    orderKey: rewritten.get(sibling.id) ?? sibling.orderKey,
  }));
  const inserted = plan.keys.map((orderKey, index) => row(100 + index, orderKey));

  return sortedIds([...keyed, ...inserted]);
};

describe("order keys", () => {
  it("equal neighbour keys trigger a rebalance instead of throwing", () => {
    const siblings = [row(1, "a0"), row(2, "a1"), row(3, "a1"), row(4, "a2")];

    // Between the two rows that share a1: Payload's generator would throw "a1 >= a1".
    expect(() => generateKeyBetween("a1", "a1")).toThrow();
    const plan = planInsertKeys({ count: 1, gap: 2, siblings });

    expect(plan.rewrites.length).toBeGreaterThan(0);
    expect(applyPlan(siblings, 2, 1)).toEqual([1, 2, 100, 3, 4]);
  });

  it("out-of-order and missing neighbour keys rebalance too", () => {
    expect(applyPlan([row(1, "a5"), row(2, "a1")], 1, 1)).toEqual([1, 100, 2]);
    expect(applyPlan([row(1, "a0"), row(2, null)], 1, 2)).toEqual([1, 100, 101, 2]);
  });

  it("a 33-character key triggers a rebalance that keeps the order", () => {
    const longKey = `a0${"1".repeat(31)}`;
    expect(longKey).toHaveLength(maxOrderKeyLength + 1);
    expect(isUsableOrderKey(longKey)).toBe(false);

    const siblings = [row(1, "a0"), row(2, longKey), row(3, "a1")];
    const plan = planInsertKeys({ count: 1, gap: 1, siblings });
    const finalKeys = [
      ...siblings.map(
        (sibling) =>
          plan.rewrites.find((rewrite) => rewrite.row === sibling)?.orderKey ?? sibling.orderKey
      ),
      ...plan.keys,
    ];

    expect(finalKeys.every((key) => (key as string).length <= maxOrderKeyLength)).toBe(true);
    expect(applyPlan(siblings, 1, 1)).toEqual([1, 100, 2, 3]);
    // A generated key that grows past the limit rebalances as well.
    const crowded = [row(1, `a0${"z".repeat(30)}`), row(2, `a0${"z".repeat(29)}zz`)];
    expect(applyPlan(crowded, 1, 1)).toEqual([1, 100, 2]);
  });

  it("unkeyed rows sort last by createdAt", () => {
    const siblings = [
      row(1, null, { createdAt: "2026-03-01T00:00:00.000Z" }),
      row(2, "a5"),
      row(3, null, { createdAt: "2026-01-01T00:00:00.000Z" }),
      row(4, "a1"),
      row(5, "", { createdAt: "2026-02-01T00:00:00.000Z" }),
    ];

    expect(sortedIds(siblings)).toEqual([4, 2, 3, 5, 1]);
  });

  it("breaks key ties by kind, then collection slug, then id", () => {
    const siblings = [
      row(9, "a1", { collection: "pages" }),
      row(3, "a1", { collection: "posts" }),
      row(7, "a1", { collection: "folders", kind: "folder" }),
      row(2, "a1", { collection: "pages" }),
    ];

    expect(sortedIds(siblings)).toEqual([7, 2, 9, 3]);
  });

  it("generates strictly ascending keys of digits and lowercase letters only", () => {
    const keys = generateNKeysBetween(null, null, 80);
    expect(keys.every((key) => isUsableOrderKey(key))).toBe(true);
    expect([...keys].sort()).toEqual(keys);

    let top = "a0";
    for (let index = 0; index < 60; index += 1) {
      const next = generateKeyBetween(null, top);
      expect(next < top).toBe(true);
      expect(next).toMatch(/^[0-9a-z]+$/u);
      top = next;
    }
  });

  it("a rebalance leaves keys that already match untouched", () => {
    const plan = planInsertKeys({
      count: 1,
      gap: 1,
      siblings: [row(1, "a0"), row(2, "a0"), row(3, "a2")],
    });

    expect(plan.rewrites.map(({ row: sibling }) => sibling.id)).toEqual([2]);
  });
});
