import { describe, expect, it } from "vitest";

import {
  buildDraftPageRequest,
  defaultPageFieldNames,
  findLocalizedFields,
  localizeNewValues,
  pageTextValues,
} from "../../src/admin/Create/localizedValues.js";

const folderValues = { name: "Aktuelles", slug: "aktuelles" };
const localizedNameAndSlug = new Set(["name", "slug"]);

describe("where a new item's typed text is written", () => {
  it("names the locale and changes nothing else while the admin shows the default locale", () => {
    expect(
      localizeNewValues({
        locales: { current: "en", default: "en" },
        localizedFields: localizedNameAndSlug,
        values: folderValues,
      })
    ).toEqual({ body: folderValues, locale: "en" });
  });

  it("writes localized fields in the current and the default locale for another locale", () => {
    expect(
      localizeNewValues({
        locales: { current: "de", default: "en" },
        localizedFields: localizedNameAndSlug,
        values: folderValues,
      })
    ).toEqual({
      body: {
        name: { de: "Aktuelles", en: "Aktuelles" },
        slug: { de: "aktuelles", en: "aktuelles" },
      },
      locale: "all",
    });
  });

  it("sends a field that is not localized as it is", () => {
    expect(
      localizeNewValues({
        locales: { current: "de", default: "en" },
        localizedFields: new Set(["title"]),
        values: { slug: "neu", title: "Neu" },
      })
    ).toEqual({ body: { slug: "neu", title: { de: "Neu", en: "Neu" } }, locale: "all" });
  });

  it("names no locale when the site is not localized", () => {
    expect(
      localizeNewValues({
        locales: { current: null, default: null },
        localizedFields: new Set(),
        values: folderValues,
      })
    ).toEqual({ body: folderValues, locale: null });
  });
});

describe("which fields of a collection are localized", () => {
  it("finds localized fields at the top level and inside layout fields", () => {
    const fields = [
      { localized: true, name: "title", type: "text" },
      { name: "body", type: "textarea" },
      {
        fields: [{ localized: true, name: "slug", type: "text" }],
        type: "row",
      },
      {
        tabs: [
          { fields: [{ localized: true, name: "summary", type: "text" }], label: "Content" },
          { fields: [{ localized: true, name: "hidden", type: "text" }], name: "named" },
        ],
        type: "tabs",
      },
    ];

    expect(findLocalizedFields(fields, ["title", "slug", "body", "summary", "hidden"])).toEqual(
      new Set(["title", "slug", "summary"])
    );
  });

  it("leaves out a field that is not localized or is not asked for", () => {
    const fields = [
      { localized: false, name: "title", type: "text" },
      { localized: true, name: "other", type: "text" },
    ];

    expect(findLocalizedFields(fields, ["title"])).toEqual(new Set());
  });
});

describe("a new page is written under the collection's own field names", () => {
  const names = { segmentField: "path", titleField: "heading" };
  const texts = { slug: "neu", title: "Neu" };

  it("names the typed text by the configured fields, not title and slug", () => {
    expect(pageTextValues(texts, names)).toEqual({ heading: "Neu", path: "neu" });
    expect(pageTextValues(texts, defaultPageFieldNames)).toEqual({ slug: "neu", title: "Neu" });
  });

  it("builds the draft request with the configured names in the default locale", () => {
    expect(
      buildDraftPageRequest({
        folder: 7,
        isFolderRoot: false,
        locales: { current: "en", default: "en" },
        localizedFields: new Set(["heading", "path"]),
        names,
        texts,
      })
    ).toEqual({
      body: { _status: "draft", folder: 7, heading: "Neu", isFolderRoot: false, path: "neu" },
      locale: "en",
    });
  });

  it("writes the configured localized fields in both locales for another locale", () => {
    const request = buildDraftPageRequest({
      folder: null,
      isFolderRoot: true,
      locales: { current: "de", default: "en" },
      localizedFields: new Set(["heading", "path"]),
      names,
      texts,
    });

    expect(request).toEqual({
      body: {
        _status: "draft",
        folder: null,
        heading: { de: "Neu", en: "Neu" },
        isFolderRoot: true,
        path: { de: "neu", en: "neu" },
      },
      locale: "all",
    });
    // Nothing is sent under the default names.
    expect(request.body).not.toHaveProperty("title");
    expect(request.body).not.toHaveProperty("slug");
  });
});
