import { describe, expect, it } from "vitest";

import { documentEnqueue } from "../documentEnqueue.js";

const document = { collection: "pages", id: "42" };

describe("a document's enqueue body", () => {
  it("translates the locales whole with no filter", () => {
    expect(
      documentEnqueue({ document, source: "en", targets: ["de", "fr"], scope: { kind: "whole" } })
    ).toEqual({
      source_lng: "en",
      target_lng: ["de", "fr"],
      collection_slug: "pages",
      collection_id: ["42"],
    });
  });

  it("names the picked leaves", () => {
    expect(
      documentEnqueue({
        document,
        source: "de",
        targets: ["fr"],
        scope: { kind: "leaves", addresses: ["title", "meta.description"] },
      })
    ).toEqual({
      source_lng: "de",
      target_lng: ["fr"],
      collection_slug: "pages",
      collection_id: ["42"],
      filters: [{ kind: "leaves", addresses: ["title", "meta.description"] }],
    });
  });

  it("asks for what is behind by the stale rule", () => {
    expect(
      documentEnqueue({ document, source: "en", targets: ["fr"], scope: { kind: "behind" } })
        .filters
    ).toEqual([{ kind: "rule", name: "stale" }]);
  });

  it("never asks to publish", () => {
    const body = documentEnqueue({
      document,
      source: "en",
      targets: ["fr"],
      scope: { kind: "whole" },
    });
    expect(body).not.toHaveProperty("publish_on_translation");
  });
});
