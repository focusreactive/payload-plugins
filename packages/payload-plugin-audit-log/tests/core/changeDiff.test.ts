import { describe, expect, it } from "vitest";
import { TRUNCATED_MARKER } from "../../src/constants";
import { createChangeDiff } from "../../src/core/changeDiff";
import { storedValuesOf } from "../../src/utils/fields";

const LOCALES = ["en", "de"] as const;
const ROWS = { rows: true } as const;

const diffOf = (
  options: {
    maxChangedPaths?: number;
    submittedData?: Record<string, unknown>;
    configuredLocales?: readonly string[];
    secretFields?: readonly string[];
  } = {}
) =>
  createChangeDiff({
    readRestrictedFields: [["token"]],
    localizedFields: [["title"], ["items", ROWS, "label"]],
    maxChangedPaths: options.maxChangedPaths ?? 200,
  })({
    submittedData: options.submittedData ?? {},
    configuredLocales: options.configuredLocales ?? LOCALES,
    secretFields: options.secretFields,
  });

const publishedBefore = {
  title: { en: "Title", de: "Titel" },
  note: "Note",
  token: "t1",
  items: [{ id: "r", label: { en: "Label", de: "Etikett" } }],
  _status: "published",
};

describe("changedFields of a save whose written document was kept", () => {
  it("lists only the field that changed when both sides are stored in every locale", () => {
    const after = { ...publishedBefore, note: "Changed" };
    const shownInEnglish = {
      title: "Title",
      note: "Changed",
      items: [{ id: "r", label: "Label" }],
    };
    expect(diffOf().changedFields(publishedBefore, shownInEnglish, after)).toEqual(["note"]);
  });

  it("lists a localized field changed in a locale other than the one shown", () => {
    const after = {
      ...publishedBefore,
      title: { en: "Title", de: "Neu" },
      items: [{ id: "r", label: { en: "Label", de: "Neu" } }],
    };
    const shownInEnglish = { title: "Title", note: "Note", items: [{ id: "r", label: "Label" }] };
    expect(diffOf().changedFields(publishedBefore, shownInEnglish, after)).toEqual([
      "title",
      "items.0.label",
    ]);
  });

  it("lists nothing when nothing changed in any locale", () => {
    const shownInGerman = { title: "Titel", note: "Note", items: [{ id: "r", label: "Etikett" }] };
    expect(diffOf().changedFields(publishedBefore, shownInGerman, { ...publishedBefore })).toEqual(
      []
    );
  });

  it("leaves out a read-restricted field the saved document does not show, unless it was submitted", () => {
    const after = { ...publishedBefore, token: "t2" };
    const shown = { title: "Title", note: "Note", items: [{ id: "r", label: "Label" }] };
    expect(diffOf().changedFields(publishedBefore, shown, after)).toEqual([]);
    expect(
      diffOf({ submittedData: { token: "t2" } }).changedFields(publishedBefore, shown, after)
    ).toEqual(["token"]);
  });

  it("compares the whole stored documents when there are no locales", () => {
    const after = { ...publishedBefore, note: "Changed" };
    expect(diffOf({ configuredLocales: [] }).changedFields(publishedBefore, after, after)).toEqual([
      "note",
    ]);
  });

  it("lists every field set when there is nothing before", () => {
    const shown = { title: "Title", note: "Note", items: [{ id: "r", label: "Label" }] };
    expect(diffOf().changedFields(undefined, shown, publishedBefore)).toEqual([
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
    expect(diffOf({ maxChangedPaths: 2 }).changedFields(publishedBefore, shown, after)).toEqual([
      "title",
      "note",
      TRUNCATED_MARKER,
    ]);
  });
});

describe("changedFields of a save in one locale whose written document was kept", () => {
  const diffOfEnglishSave = (submittedData: Record<string, unknown>) =>
    createChangeDiff({
      readRestrictedFields: [["secret"]],
      localizedFields: [["title"], ["secret"]],
      maxChangedPaths: 200,
    })({ submittedData, savedIn: { locale: "en" }, configuredLocales: LOCALES });

  const before = { title: { en: "T", de: "T-de" }, secret: { en: "s-en", de: "s-de" } };
  const shownInEnglish = { title: "T3" };

  it("compares a submitted read-restricted value only in the locale of the save", () => {
    const after = { ...before, title: { en: "T3", de: "T-de" } };
    expect(
      diffOfEnglishSave({ title: "T3", secret: "s-en" }).changedFields(
        before,
        shownInEnglish,
        after
      )
    ).toEqual(["title"]);
  });

  it("still lists a read-restricted value the save changed in its locale", () => {
    const after = { title: { en: "T3", de: "T-de" }, secret: { en: "s-new", de: "s-de" } };
    expect(
      diffOfEnglishSave({ title: "T3", secret: "s-new" }).changedFields(
        before,
        shownInEnglish,
        after
      )
    ).toEqual(["title", "secret"]);
  });
});

describe("changedFields with secret fields", () => {
  it("lists the secret fields first and keeps them within the limit", () => {
    const after = { ...publishedBefore, note: "Changed", _status: "draft" };
    expect(diffOf({ secretFields: ["password"] }).changedFields(publishedBefore, after)).toEqual([
      "password",
      "note",
      "_status",
    ]);
    expect(
      diffOf({ maxChangedPaths: 2, secretFields: ["password", "apiKey"] }).changedFields(
        publishedBefore,
        after
      )
    ).toEqual(["password", "apiKey", TRUNCATED_MARKER]);
  });
});

describe("createdFields", () => {
  const diffOfCreate = (submittedData: Record<string, unknown>) =>
    createChangeDiff({
      readRestrictedFields: [["token"], ["details", "secret"], ["links", ROWS, "secret"]],
      maxChangedPaths: 200,
    })({ submittedData });

  it("lists the hidden and read-restricted fields a create wrote although the created document leaves them out", () => {
    const submitted = {
      title: "T",
      token: "t1",
      details: { secret: "s1" },
      links: [{ id: "r", secret: "s2" }],
    };
    const shown = { id: 1, title: "T", details: {}, links: [{ id: "r" }] };
    expect(diffOfCreate(submitted).createdFields(shown)).toEqual([
      "title",
      "details",
      "links",
      "token",
    ]);
  });

  it("does not list hidden and read-restricted fields a create did not write", () => {
    const shown = { id: 1, title: "T", details: {} };
    expect(diffOfCreate({ title: "T", details: {} }).createdFields(shown)).toEqual(["title"]);
  });

  it("does not list a group or named tab whose only submitted value is a nested virtual field", () => {
    const flattenedFields = [
      { name: "title", type: "text" },
      {
        name: "details",
        type: "group",
        flattenedFields: [
          { name: "label", type: "text" },
          { name: "computed", type: "text", virtual: true },
          { name: "secret", type: "text" },
        ],
      },
      {
        name: "meta",
        type: "tab",
        flattenedFields: [
          {
            name: "inner",
            type: "group",
            flattenedFields: [{ name: "computed", type: "text", virtual: true }],
          },
        ],
      },
    ];
    const diffOfVirtualCreate = (submittedData: Record<string, unknown>) =>
      createChangeDiff({
        readRestrictedFields: [
          ["details", "computed"],
          ["details", "secret"],
          ["meta", "inner", "computed"],
        ],
        maxChangedPaths: 200,
      })({ storedValuesOf: storedValuesOf([])({ flattenedFields }), submittedData });
    const shown = { id: 1, title: "T", details: { label: null }, meta: { inner: {} } };
    const virtualOnly = {
      title: "T",
      details: { computed: "c" },
      meta: { inner: { computed: "c" } },
    };
    expect(diffOfVirtualCreate(virtualOnly).createdFields(shown)).toEqual(["title"]);
    const withSecret = { title: "T", details: { computed: "c", secret: "s" } };
    expect(diffOfVirtualCreate(withSecret).createdFields(shown)).toEqual(["title", "details"]);
  });
});
