import { describe, expect, it } from "vitest";
import { scoreInclusive } from "../../src/engine/inclusiveScore";
import type { InclusiveCategoryId } from "../../src/engine/types/analysis";

const ALL: InclusiveCategoryId[] = [
  "age",
  "appearance",
  "culture",
  "disability",
  "gender",
  "sexualOrientation",
  "other",
];

describe("scoreInclusive", () => {
  it("returns 100 and all-clean when there are no flags", () => {
    const r = scoreInclusive([], ALL);
    expect(r.ringScore).toBe(100);
    expect(r.categories).toEqual([]);
    expect(r.cleanCategories).toEqual(ALL);
  });

  it("groups flags by category and lists remaining categories as clean", () => {
    const r = scoreInclusive(
      [
        {
          category: "gender",
          term: "chairman",
          suggestion: "chair, chairperson",
          location: "Section 1, ¶3",
        },
        {
          category: "gender",
          term: "manpower",
          suggestion: "workforce, staff",
          location: "Section 4, ¶2",
        },
      ],
      ALL
    );
    expect(r.categories).toHaveLength(1);
    expect(r.categories[0]?.id).toBe("gender");
    expect(r.categories[0]?.flags).toHaveLength(2);
    expect(r.cleanCategories).not.toContain("gender");
    expect(r.ringScore).toBeLessThan(100);
    expect(r.ringScore).toBeGreaterThanOrEqual(0);
  });
});
