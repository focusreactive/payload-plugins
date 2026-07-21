import { describe, it, expect } from "vitest";
import type { CollectionConfig } from "payload";

import { getAutoTranslateConfig } from "./core/domain/auto-translate";
import { withAutoTranslate } from "./auto-translate-config";

const collection = (over: Partial<CollectionConfig> = {}): CollectionConfig =>
  ({ slug: "posts", fields: [], ...over }) as CollectionConfig;

describe("withAutoTranslate / getAutoTranslateConfig round-trip", () => {
  it("stamps config on custom and reads it back", () => {
    const configured = withAutoTranslate(collection(), { targets: ["de", "fr"], debounceMs: 2000 });
    expect(getAutoTranslateConfig(configured)).toEqual({ targets: ["de", "fr"], debounceMs: 2000 });
  });

  it("returns null when the collection is not opted in", () => {
    expect(getAutoTranslateConfig(collection())).toBeNull();
    expect(getAutoTranslateConfig({})).toBeNull();
  });

  it("does not mutate the input collection", () => {
    const input = collection();
    withAutoTranslate(input, { targets: ["de"] });
    expect(input.custom).toBeUndefined();
  });

  it("preserves existing custom keys", () => {
    const configured = withAutoTranslate(collection({ custom: { other: 1 } }), {
      targets: ["de"],
    });
    expect((configured.custom as Record<string, unknown>).other).toBe(1);
  });
});
