// tests/services/pageFilter/buildPageFilterContext.labels.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildPageFilterContext } from "../../../src/services/pageFilter/buildPageFilterContext";
import { __clearExistingRefsCache } from "../../../src/services/pageFilter/existingRefsCache";
import { __clearPageLabelsCache } from "../../../src/services/pageFilter/pageLabelsCache";
import type { ResolvedPagesConfig } from "../../../src/config/resolvePagesConfig";

const cfg: ResolvedPagesConfig = {
  collections: [{ slug: "pages", publishedOnly: true, titleField: "title" }],
  syntheticRefs: ["__home"],
  dimensions: { pageRef: "customEvent:fr_page_ref", contentLocale: "customEvent:fr_content_locale" },
  resolvePagePath: (ref) => (ref === "__home" ? "/" : `/p/${ref.split(":")[1]}`),
};

describe("buildPageFilterContext.resolveLabels", () => {
  beforeEach(() => {
    __clearExistingRefsCache();
    __clearPageLabelsCache();
  });

  it("exposes resolveLabels that maps refs to {path,title}", async () => {
    const payload = {
      config: { localization: { defaultLocale: "en" } },
      find: vi.fn(async ({ collection }: { collection: string }) => (collection === "pages" ? { docs: [{ id: 5, title: "Five" }] } : { docs: [] })),
    };
    const ctx = await buildPageFilterContext({ payload } as never, cfg);
    const labels = await ctx!.resolveLabels(["pages:5", "__home"]);
    expect(labels.get("pages:5")).toEqual({ path: "/p/5", title: "Five" });
    expect(labels.get("__home")).toEqual({ path: "/", title: "/" });
  });
});
