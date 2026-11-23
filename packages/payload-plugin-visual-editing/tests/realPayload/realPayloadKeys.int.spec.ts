import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Site } from "../support/realPayload";

import { markersAt, metaAt, valueAt } from "../support/markedData";
import { seedSite, START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import { page } from "../support/richTextPages";

describe("a draft read through Payload with instantPreview", () => {
  let payload: Payload;
  let site: Site;
  let home: unknown;

  beforeAll(async () => {
    payload = await startRealPayload({ name: "keys", plugin: { instantPreview: true } });
    site = await seedSite(payload);
    home = await payload.findByID({ collection: "pages", depth: 1, draft: true, id: site.home });
  }, START_TIMEOUT_MS);

  afterAll(() => payload.destroy());

  it("states the stable key of a field in an array row or a block", () => {
    const rowId = valueAt(home, "list.1.id");
    const blockId = valueAt(home, "layout.0.id");

    expect(markersAt(home, "list.1.label")).toEqual([
      { ...page(site.home), key: `list.${rowId}.label`, path: "list.1.label" },
    ]);
    expect(markersAt(home, "layout.0.blockName")).toEqual([
      { ...page(site.home), key: `layout.${blockId}.blockName`, path: "layout.0.blockName" },
    ]);
  });

  it("states the stable key of a field in an array row of a global", async () => {
    const settings = await payload.findGlobal({ depth: 0, draft: true, slug: "settings" });
    const rowId = valueAt(settings, "nav.0.id");

    expect(markersAt(settings, "nav.0.label")).toEqual([
      {
        collectionSlug: "settings",
        key: `nav.${rowId}.label`,
        kind: "global",
        path: "nav.0.label",
      },
    ]);
  });

  it("states no key for a field outside any row", () => {
    expect(markersAt(home, "title")).toEqual([{ ...page(site.home), path: "title" }]);
    expect(markersAt(home, "seo.description")).toEqual([
      { ...page(site.home), path: "seo.description" },
    ]);
  });

  it("states the key a populated document has when it is read on its own", () => {
    const rowId = valueAt(home, "related.layout.0.id");

    expect(markersAt(home, "related.layout.0.heading")).toEqual([
      { ...page(site.about), key: `layout.${rowId}.heading`, path: "layout.0.heading" },
    ]);
  });

  it("states no key in the _meta of an upload or a related document in a row", () => {
    expect(metaAt(home, "layout.0.image")).toEqual({
      ...page(site.home),
      path: "layout.0.image",
      terminal: true,
    });
    expect(metaAt(home, "layout.0.picked")).toEqual({
      ...page(site.home),
      path: "layout.0.picked",
      terminal: true,
    });
  });
});
