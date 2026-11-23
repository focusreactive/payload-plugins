import { describe, expect, it } from "vitest";

import type { OpenForms, PageFieldsDeps } from "../../src/client/inlineEditing/pageFields";

import type { VeDocument } from "../../src/shared/protocol";

import { createPageFields } from "../../src/client/inlineEditing/pageFields";
import { editedFieldAddressOf } from "../../src/shared/veDocument";

const PAGE = { collectionSlug: "page", docId: "1", kind: "collection" } as const;

const OTHER_PAGE = { ...PAGE, docId: "2" };

const TITLE = { ...PAGE, path: "title" };

const TITLE_FIELD = { ...PAGE, key: "title", locale: "en" };

const formsOf = (document: VeDocument, keys: readonly string[]): OpenForms => ({
  holdsAnyForm: () => true,
  holdsFormOf: ({ docId }) => docId === document.docId,
  holdsValueOf: ({ docId }, key) => docId === document.docId && keys.includes(key),
});

const pageFieldsWith = (deps: Partial<PageFieldsDeps> = {}) =>
  createPageFields({
    getLocale: () => "en",
    isNextToAdmin: () => false,
    openForms: null,
    ...deps,
  });

describe("the fields of the page", () => {
  it("names the document, the key and the locale of the page, with its address", () => {
    expect(pageFieldsWith().fieldOf(TITLE)).toEqual({
      address: editedFieldAddressOf(TITLE_FIELD),
      field: TITLE_FIELD,
    });
  });

  it("names no locale on a project without locales", () => {
    const answer = pageFieldsWith({ getLocale: () => undefined }).fieldOf(TITLE);

    expect(answer).toEqual({
      address: editedFieldAddressOf({ ...PAGE, key: "title" }),
      field: { ...PAGE, key: "title" },
    });
  });

  it("takes the key of a field in a row from the marker", () => {
    const answer = pageFieldsWith().fieldOf({
      ...PAGE,
      key: "rows.r1.title",
      path: "rows.0.title",
    });

    expect(answer).toMatchObject({ field: { key: "rows.r1.title" } });
  });

  it("is no field for a row the marker names only by its index", () => {
    expect(pageFieldsWith().fieldOf({ ...PAGE, path: "rows.0.title" })).toEqual({
      notEditable: "no-field-key",
    });
  });

  it("is no field for a value read in every locale, whatever its kind", () => {
    const fields = pageFieldsWith();
    const localized = { ...TITLE, locale: "de" };

    expect(fields.fieldOf(localized)).toEqual({ notEditable: "read-in-every-locale" });
    for (const kind of ["text", "image", "rich-text"] as const) {
      expect(fields.editableFieldOf(localized, kind)).toEqual({
        notEditable: "read-in-every-locale",
      });
    }
  });

  describe("on a page of its own", () => {
    it("edits every field of the page here", () => {
      expect(pageFieldsWith().editableFieldOf(TITLE, "text")).toMatchObject({
        field: TITLE_FIELD,
      });
    });
  });

  describe("on a page next to the admin", () => {
    const nextToAdmin = (openForms: OpenForms | null) =>
      pageFieldsWith({ isNextToAdmin: () => true, openForms });

    it("edits text here only when the form holds a value of the field", () => {
      const fields = nextToAdmin(formsOf(PAGE, ["title"]));

      expect(fields.editableFieldOf(TITLE, "text")).toMatchObject({ field: TITLE_FIELD });
      expect(fields.editableFieldOf({ ...PAGE, path: "subtitle" }, "text")).toEqual({
        notEditable: "form-not-open",
      });
    });

    it("edits an image or rich text here when the form of its document is open", () => {
      const fields = nextToAdmin(formsOf(PAGE, []));

      expect(fields.editableFieldOf({ ...PAGE, path: "image" }, "image")).toMatchObject({
        field: { key: "image" },
      });
      expect(fields.editableFieldOf({ ...PAGE, path: "body" }, "rich-text")).toMatchObject({
        field: { key: "body" },
      });
    });

    it("edits nothing of a document whose form is not open", () => {
      const fields = nextToAdmin(formsOf(OTHER_PAGE, ["title"]));

      for (const kind of ["text", "image", "rich-text"] as const) {
        expect(fields.editableFieldOf(TITLE, kind)).toEqual({ notEditable: "form-not-open" });
      }
    });

    it("edits nothing without a record of the open forms", () => {
      expect(nextToAdmin(null).editableFieldOf(TITLE, "image")).toEqual({
        notEditable: "form-not-open",
      });
    });

    it("still names the field of an edit that runs once the form closed", () => {
      expect(nextToAdmin(formsOf(OTHER_PAGE, [])).fieldOf(TITLE)).toMatchObject({
        field: TITLE_FIELD,
      });
    });
  });
});
