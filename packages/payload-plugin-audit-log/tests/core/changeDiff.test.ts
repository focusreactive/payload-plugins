import { describe, expect, it } from "vitest";
import { TRUNCATED_MARKER } from "../../src/constants";
import { createChangeDiff } from "../../src/core/changeDiff";

const LOCALES = ["en", "de"] as const;
const ROWS = { rows: true } as const;

const diffOf = (
  options: { maxChangedPaths?: number; submittedData?: Record<string, unknown> } = {}
) =>
  createChangeDiff({
    readRestrictedFields: [["token"]],
    localizedFields: [["title"], ["items", ROWS, "label"]],
    maxChangedPaths: options.maxChangedPaths ?? 200,
  })({ submittedData: options.submittedData ?? {} });

const publishedBefore = {
  title: { en: "Title", de: "Titel" },
  note: "Note",
  token: "t1",
  items: [{ id: "r", label: { en: "Label", de: "Etikett" } }],
  _status: "published",
};

describe("changedStoredFields", () => {
  it("lists only the field that changed when both sides are stored in every locale", () => {
    const after = { ...publishedBefore, note: "Changed" };
    const shownInEnglish = {
      title: "Title",
      note: "Changed",
      items: [{ id: "r", label: "Label" }],
    };
    expect(diffOf().changedStoredFields(publishedBefore, after, shownInEnglish, LOCALES)).toEqual([
      "note",
    ]);
  });

  it("lists a localized field changed in a locale other than the one shown", () => {
    const after = {
      ...publishedBefore,
      title: { en: "Title", de: "Neu" },
      items: [{ id: "r", label: { en: "Label", de: "Neu" } }],
    };
    const shownInEnglish = { title: "Title", note: "Note", items: [{ id: "r", label: "Label" }] };
    expect(diffOf().changedStoredFields(publishedBefore, after, shownInEnglish, LOCALES)).toEqual([
      "title",
      "items.0.label",
    ]);
  });

  it("lists nothing when nothing changed in any locale", () => {
    const shownInGerman = { title: "Titel", note: "Note", items: [{ id: "r", label: "Etikett" }] };
    expect(
      diffOf().changedStoredFields(publishedBefore, { ...publishedBefore }, shownInGerman, LOCALES)
    ).toEqual([]);
  });

  it("leaves out a read-restricted field the saved document does not show, unless it was submitted", () => {
    const after = { ...publishedBefore, token: "t2" };
    const shown = { title: "Title", note: "Note", items: [{ id: "r", label: "Label" }] };
    expect(diffOf().changedStoredFields(publishedBefore, after, shown, LOCALES)).toEqual([]);
    expect(
      diffOf({ submittedData: { token: "t2" } }).changedStoredFields(
        publishedBefore,
        after,
        shown,
        LOCALES
      )
    ).toEqual(["token"]);
  });

  it("compares the whole stored documents when there are no locales", () => {
    const after = { ...publishedBefore, note: "Changed" };
    expect(diffOf().changedStoredFields(publishedBefore, after, after, [])).toEqual(["note"]);
  });

  it("lists every field set when there is nothing before", () => {
    const shown = { title: "Title", note: "Note", items: [{ id: "r", label: "Label" }] };
    expect(diffOf().changedStoredFields(undefined, publishedBefore, shown, LOCALES)).toEqual([
      "title",
      "note",
      "items",
      "_status",
    ]);
  });

  it("caps the changes of all locales together at the limit", () => {
    const after = {
      ...publishedBefore,
      title: { en: "New", de: "Neu" },
      note: "Changed",
      items: [{ id: "r", label: { en: "Label", de: "Neu" } }],
    };
    const shown = { title: "New", note: "Changed", items: [{ id: "r", label: "Label" }] };
    expect(
      diffOf({ maxChangedPaths: 2 }).changedStoredFields(publishedBefore, after, shown, LOCALES)
    ).toEqual(["title", "note", TRUNCATED_MARKER]);
  });
});

describe("changedStoredFields of a save in one locale", () => {
  const diffOfEnglishSave = (submittedData: Record<string, unknown>) =>
    createChangeDiff({
      readRestrictedFields: [["secret"]],
      localizedFields: [["title"], ["secret"]],
      maxChangedPaths: 200,
    })({ submittedData, saveLocale: "en" });

  const before = { title: { en: "T", de: "T-de" }, secret: { en: "s-en", de: "s-de" } };
  const shownInEnglish = { title: "T3" };

  it("compares a submitted read-restricted value only in the locale of the save", () => {
    const after = { ...before, title: { en: "T3", de: "T-de" } };
    expect(
      diffOfEnglishSave({ title: "T3", secret: "s-en" }).changedStoredFields(
        before,
        after,
        shownInEnglish,
        LOCALES
      )
    ).toEqual(["title"]);
  });

  it("still lists a read-restricted value the save changed in its locale", () => {
    const after = { title: { en: "T3", de: "T-de" }, secret: { en: "s-new", de: "s-de" } };
    expect(
      diffOfEnglishSave({ title: "T3", secret: "s-new" }).changedStoredFields(
        before,
        after,
        shownInEnglish,
        LOCALES
      )
    ).toEqual(["title", "secret"]);
  });
});
