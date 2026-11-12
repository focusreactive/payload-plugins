import { describe, expect, it } from "vitest";
import { withStoredLocalizedValues } from "../../src/core/storedLocalizedValues";

const paths = [["motto"], ["seo", "description"], ["links", { rows: true }, "label"]] as const;

const rowPaths = [
  ["links", { rows: true }, "label"],
  ["layout", { rows: true, blockType: "quote" }, "text"],
] as const;

describe("stored localized values", () => {
  it("takes the stored value of the locale for localized fields outside rows", () => {
    expect(
      withStoredLocalizedValues(
        { motto: "Same", seo: { description: "Same", title: "t" }, body: "b" },
        { motto: { en: "Same" }, seo: { description: { en: "Same", de: "Gleich" } }, body: "b" },
        paths,
        "de"
      )
    ).toEqual({ motto: undefined, seo: { description: "Gleich", title: "t" }, body: "b" });
  });

  it("keeps the document when nothing is stored yet", () => {
    const doc = { motto: "Same" };
    expect(withStoredLocalizedValues(doc, null, paths, "de")).toBe(doc);
  });

  it("takes the stored value of the locale inside array and block rows, matching rows by id", () => {
    expect(
      withStoredLocalizedValues(
        {
          links: [
            { id: "b", label: "B" },
            { id: "a", label: "A" },
          ],
          layout: [
            { id: "q", blockType: "quote", text: "Q" },
            { id: "c", blockType: "cta", text: "shown" },
          ],
        },
        {
          links: [
            { id: "a", label: { en: "A", de: "A-de" } },
            { id: "b", label: { en: "B" } },
          ],
          layout: [
            { id: "c", blockType: "cta", text: "stored" },
            { id: "q", blockType: "quote", text: { en: "Q", de: "Q-de" } },
          ],
        },
        rowPaths,
        "de"
      )
    ).toEqual({
      links: [
        { id: "b", label: undefined },
        { id: "a", label: "A-de" },
      ],
      layout: [
        { id: "q", blockType: "quote", text: "Q-de" },
        { id: "c", blockType: "cta", text: "shown" },
      ],
    });
  });

  it("matches rows without an id by position and leaves rows that are not stored without a value", () => {
    expect(
      withStoredLocalizedValues(
        { links: [{ label: "A" }, { label: "B" }] },
        { links: [{ label: { en: "A", de: "A-de" } }] },
        rowPaths,
        "de"
      )
    ).toEqual({ links: [{ label: "A-de" }, { label: undefined }] });
  });

  it("leaves fields the document does not have alone", () => {
    const doc = { links: [{ id: "a" }] };
    expect(
      withStoredLocalizedValues(doc, { links: [{ id: "a", label: { de: "A" } }] }, rowPaths, "de")
    ).toEqual(doc);
  });
});
