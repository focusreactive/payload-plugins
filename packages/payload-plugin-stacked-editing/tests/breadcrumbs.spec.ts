import { describe, expect, it } from "vitest";

import {
  buildBreadcrumbs,
  createTranslate,
  fieldLabelOf,
  humanize,
  rowLabelOf,
} from "../src/lib/breadcrumbs.js";
import { resolveRowChain } from "../src/lib/resolveRowChain.js";
import { blocksMap, documentFields, getBlockType } from "./fixtures.js";

const levels = resolveRowChain({
  blocksMap,
  fields: documentFields,
  getBlockType,
  permissions: true,
  rowPath: "layout.0.items.2.callouts.0",
}).levels;

const translate = createTranslate({ language: "de", fallbackLanguage: "en" });

describe("labels", () => {
  it("translates every Payload label shape", () => {
    expect(translate("Plain")).toBe("Plain");
    expect(translate({ en: "Callout", de: "Hinweis" })).toBe("Hinweis");
    expect(createTranslate({ language: "fr" })({ en: "Callout", de: "Hinweis" })).toBe("Callout");
    expect(translate(({ t }: { t?: unknown }) => (t ? "with t" : "fn"))).toBe("fn");
    expect(translate(false)).toBe("");
  });

  it("humanizes names", () => {
    expect(humanize("deepNest")).toBe("Deep Nest");
    expect(humanize("call_to-action")).toBe("Call to action");
  });

  it("names rows like Payload's row header, plus a title when there is one", () => {
    const values: Record<string, string> = {
      "layout.0.blockName": "Landing hero",
      "layout.0.items.2.label": "  Pricing  ",
    };
    const getValue = (path: string) => values[path];
    const [deepNest, item, callout] = levels;
    if (!(deepNest && item && callout)) {
      throw new Error("chain");
    }
    expect(rowLabelOf(deepNest, translate, getValue)).toEqual({
      label: "Deep Nest 01",
      title: "Landing hero",
    });
    expect(rowLabelOf(item, translate, getValue)).toEqual({ label: "Item 03", title: "Pricing" });
    expect(rowLabelOf(callout, translate, getValue)).toEqual({ label: "Hinweis 01" });
    expect(fieldLabelOf(item, translate)).toBe("Items");
  });
});

describe("buildBreadcrumbs", () => {
  const crumbLevels = [
    { rowPath: "layout.0", fieldLabel: "Layout", rowLabel: "Deep Nest 01" },
    { rowPath: "layout.0.items.2", fieldLabel: "Items", rowLabel: "Item 03" },
    { rowPath: "layout.0.items.2.callouts.0", fieldLabel: "Callouts", rowLabel: "Callout 01" },
  ];

  it("lists document › field › row … down to the panel", () => {
    const crumbs = buildBreadcrumbs({ documentTitle: "Home", levels: crumbLevels });
    expect(crumbs.map((crumb) => crumb.label)).toEqual([
      "Home",
      "Layout",
      "Deep Nest 01",
      "Items",
      "Item 03",
      "Callouts",
      "Callout 01",
    ]);
    expect(crumbs.filter((crumb) => crumb.current).map((crumb) => crumb.label)).toEqual([
      "Callout 01",
    ]);
  });

  it("says how many panels each crumb keeps open", () => {
    const crumbs = buildBreadcrumbs({ documentTitle: "Home", levels: crumbLevels });
    expect(crumbs.map((crumb) => [crumb.label, crumb.keep])).toEqual([
      ["Home", 0],
      ["Layout", 0],
      ["Deep Nest 01", 1],
      ["Items", 1],
      ["Item 03", 2],
      ["Callouts", 2],
      ["Callout 01", 3],
    ]);
  });

  it("stops at the panel's own depth", () => {
    const crumbs = buildBreadcrumbs({ documentTitle: "Home", levels: crumbLevels, depth: 0 });
    expect(crumbs.map((crumb) => crumb.label)).toEqual(["Home", "Layout", "Deep Nest 01"]);
    expect(crumbs.at(-1)?.current).toBe(true);
  });
});

describe("buildBreadcrumbs hints and levels", () => {
  it("carries the type hint and nesting level of each crumb for the hidden-levels menu", () => {
    const crumbs = buildBreadcrumbs({
      documentTitle: "Home",
      levels: [
        {
          rowPath: "s.0",
          fieldLabel: "Sections",
          rowLabel: "Features 03",
          fieldHint: "Blocks",
          rowHint: "Features",
        },
        {
          rowPath: "s.0.i.1",
          fieldLabel: "Items",
          rowLabel: "Feature 02",
          fieldHint: "Array",
          rowHint: "Feature",
        },
      ],
    });
    expect(crumbs.map((crumb) => [crumb.label, crumb.level, crumb.hint])).toEqual([
      ["Home", 0, undefined],
      ["Sections", 1, "Blocks"],
      ["Features 03", 2, "Features"],
      ["Items", 3, "Array"],
      ["Feature 02", 4, "Feature"],
    ]);
  });
});
