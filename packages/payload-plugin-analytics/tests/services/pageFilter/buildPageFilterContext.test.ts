// tests/services/pageFilter/buildPageFilterContext.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildPageFilterContext } from "../../../src/services/pageFilter/buildPageFilterContext";
import { __clearExistingRefsCache } from "../../../src/services/pageFilter/existingRefsCache";
import type { ResolvedPagesConfig } from "../../../src/config/resolvePagesConfig";

const cfg: ResolvedPagesConfig = {
  collections: [{ slug: "page", publishedOnly: true, titleField: "title" }],
  syntheticRefs: ["__home"],
  dimensions: { pageRef: "customEvent:fr_page_ref", contentLocale: "customEvent:fr_content_locale" },
};

describe("buildPageFilterContext", () => {
  beforeEach(() => __clearExistingRefsCache());

  it("returns null when pages config is null (feature off)", async () => {
    const payload = { find: vi.fn() };
    const ctx = await buildPageFilterContext({ payload } as never, null);
    expect(ctx).toBeNull();
    expect(payload.find).not.toHaveBeenCalled();
  });

  it("returns refs + dim names when configured", async () => {
    const payload = { find: vi.fn().mockResolvedValue({ docs: [{ id: 1 }] }) };
    const ctx = await buildPageFilterContext({ payload } as never, cfg);
    expect(ctx?.refs.sort()).toEqual(["__home", "page:1"].sort());
    expect(ctx?.pageRefDim).toBe("customEvent:fr_page_ref");
    expect(ctx?.contentLocaleDim).toBe("customEvent:fr_content_locale");
  });

  it("publishes the resolved refs to the active holder", async () => {
    const { getActiveExistingRefs, __clearActiveExistingRefs } = await import("../../../src/services/pageFilter/activeRefsHolder");
    __clearActiveExistingRefs();
    const payload = { find: vi.fn().mockResolvedValue({ docs: [{ id: 1 }] }) };
    await buildPageFilterContext({ payload } as never, cfg);
    expect(getActiveExistingRefs().sort()).toEqual(["__home", "page:1"].sort());
  });
});
