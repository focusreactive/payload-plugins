import { describe, expect, it } from "vitest";

import type { ConfiguredField } from "../collectionPresentation.js";
import { collectionPresentation } from "../collectionPresentation.js";
import { excludedLabels } from "../excludedLabels.js";

const excluding = { custom: { translateKit: { exclude: true } } };

const of = (fields: ConfiguredField[]) =>
  excludedLabels(fields, collectionPresentation({ fields }));

describe("the fields a run leaves alone because they opted out", () => {
  it("names a translatable leaf that opted out, by its label", () => {
    expect(
      of([
        { name: "slug", type: "text", localized: true, ...excluding },
        { name: "title", type: "text", localized: true },
      ])
    ).toStrictEqual(["Slug"]);
  });

  it("names one nested in a group or a block, since the reader asks what is not translated", () => {
    const fields: ConfiguredField[] = [
      {
        name: "seo",
        type: "group",
        localized: true,
        fields: [
          { name: "keywords", type: "text", localized: true, label: "Keywords", ...excluding },
        ],
      },
      {
        name: "sections",
        type: "blocks",
        blocks: [
          {
            slug: "hero",
            fields: [{ name: "badge", type: "text", localized: true, ...excluding }],
          },
        ],
      },
    ];

    expect([...of(fields)].sort()).toStrictEqual(["Badge", "Keywords"]);
  });

  it("says nothing about a field no run would translate even without the flag", () => {
    expect(
      of([
        { name: "views", type: "number", localized: true, ...excluding },
        { name: "sku", type: "text", ...excluding },
      ])
    ).toStrictEqual([]);
  });

  it("says nothing where no field opted out", () => {
    expect(of([{ name: "title", type: "text", localized: true }])).toStrictEqual([]);
  });
});
