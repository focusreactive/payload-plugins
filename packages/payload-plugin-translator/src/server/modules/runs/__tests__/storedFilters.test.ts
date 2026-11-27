import { describe, expect, it } from "vitest";

import { filtersFromStore, storedFilters } from "../storedFilters.js";
import type { TranslationFilter } from "../../../../core/domain/selection/index.js";

const aFilter = [{ kind: "paths", paths: ["title"] }] as unknown as TranslationFilter[];

describe("what a locale's filters look like in the row", () => {
  it("stores nothing when the ask carried no filters", () => {
    expect(storedFilters(undefined)).toBeNull();
  });

  it("stores nothing for an empty list, which asks for the whole document just the same", () => {
    expect(storedFilters([])).toBeNull();
  });

  it("stores the filters as they were asked, readable back as themselves", () => {
    const stored = storedFilters(aFilter);

    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string)).toEqual(aFilter);
  });
});

describe("what a stored filters value means, read back", () => {
  const readable = { kind: "rule", name: "stale" };

  it("keeps the entries that read, and drops only the one that does not", () => {
    expect(
      filtersFromStore(JSON.stringify([readable, { nonsense: true }])),
      "dropping the whole list would translate nothing for a locale that asked for something"
    ).toEqual([readable]);
  });

  it("asks for the whole document when the stored text is not JSON at all", () => {
    expect(filtersFromStore("}{ not json")).toEqual([]);
  });

  it("asks for the whole document when the stored JSON is not a list", () => {
    expect(filtersFromStore(JSON.stringify(readable))).toEqual([]);
  });

  it("asks for the whole document when nothing was stored", () => {
    expect(filtersFromStore(null)).toEqual([]);
  });
});
