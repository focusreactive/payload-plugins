import type { SanitizedDocumentPermissions } from "payload";

import { describe, expect, it } from "vitest";

import type { FieldStep } from "../../src/shared/fieldKey";

import { mayUpdateFieldAt } from "../../src/admin/inlineEditing/fieldPermissions";

const READ_ONLY = { create: true, read: true };
const UPDATABLE = { create: true, read: true, update: true };

const documentWith = (fields: unknown, update = true) =>
  ({ fields, read: true, ...(update && { update }) }) as unknown as SanitizedDocumentPermissions;

const ROW = { rowId: "row-a" };
const HERO_ROW = { blockType: "hero", rowId: "row-b" };

const STEPS: Record<string, readonly FieldStep[]> = {
  arrayLabel: [{ name: "links" }, ROW, { name: "label" }],
  heroHeading: [{ name: "layout" }, HERO_ROW, { name: "heading" }],
  seoDescription: [{ name: "seo" }, { name: "description" }],
  title: [{ name: "title" }],
};

describe("whether the user may update a field of the open document", () => {
  it.each<[string, unknown, readonly FieldStep[]]>([
    ["every field of the document", true, STEPS.title!],
    ["a field granted as a whole", { title: true }, STEPS.title!],
    ["a field the user may update", { title: UPDATABLE }, STEPS.title!],
    [
      "a field of a group the user may update",
      { seo: { ...UPDATABLE, fields: { description: UPDATABLE } } },
      STEPS.seoDescription!,
    ],
    ["a field of a group granted as a whole", { seo: true }, STEPS.seoDescription!],
    [
      "a field of an array row",
      { links: { ...UPDATABLE, fields: { label: UPDATABLE } } },
      STEPS.arrayLabel!,
    ],
    [
      "a field of a block",
      { layout: { ...UPDATABLE, blocks: { hero: { fields: { heading: UPDATABLE } } } } },
      STEPS.heroHeading!,
    ],
    [
      "a field of a block granted as a whole",
      { layout: { ...UPDATABLE, blocks: { hero: true } } },
      STEPS.heroHeading!,
    ],
    ["a field of every block", { layout: { ...UPDATABLE, blocks: true } }, STEPS.heroHeading!],
  ])("says yes for %s", (_name, fields, steps) => {
    expect(mayUpdateFieldAt(documentWith(fields), steps)).toBe(true);
  });

  it.each<[string, unknown, readonly FieldStep[]]>([
    ["a field the user may only read", { title: READ_ONLY }, STEPS.title!],
    ["a field the permissions do not name", { summary: UPDATABLE }, STEPS.title!],
    [
      "a field of a group the user may only read",
      { seo: { ...UPDATABLE, fields: { description: READ_ONLY } } },
      STEPS.seoDescription!,
    ],
    [
      "a field of an array row the user may only read",
      { links: { ...UPDATABLE, fields: { label: READ_ONLY } } },
      STEPS.arrayLabel!,
    ],
    [
      "a field of a block the user may only read",
      { layout: { ...UPDATABLE, blocks: { hero: { fields: { heading: READ_ONLY } } } } },
      STEPS.heroHeading!,
    ],
    [
      "a field of a block the permissions do not name",
      { layout: { ...UPDATABLE, blocks: { quote: true } } },
      STEPS.heroHeading!,
    ],
  ])("says no for %s", (_name, fields, steps) => {
    expect(mayUpdateFieldAt(documentWith(fields), steps)).toBe(false);
  });

  it("says no for a document the user may not update", () => {
    expect(mayUpdateFieldAt(documentWith(true, false), STEPS.title!)).toBe(false);
  });

  it("says no while the permissions of the document are unknown", () => {
    expect(mayUpdateFieldAt(undefined, STEPS.title!)).toBe(false);
  });
});
