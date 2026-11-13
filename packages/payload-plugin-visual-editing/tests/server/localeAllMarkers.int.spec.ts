import { vercelStegaDecode, vercelStegaSplit } from "@vercel/stega";
import { describe, expect, it } from "vitest";

import type { Field } from "payload";

import type { SchemaField } from "../../src/shared/editableSchema/editableSchema";

import { buildEditableSchema } from "../../src/shared/editableSchema/editableSchema";
import { markRead } from "../../src/server/markRead";
import { META_KEY } from "../../src/shared/shared";

import { editorState } from "../support/editorState";
import { configOf } from "../support/payloadConfig";
import { draftReadRequest, readThroughPlugin } from "../support/pluginHooks";

const LOCALE_CODES = ["en", "de"];

const pageFields = [
  { localized: true, name: "title", type: "text" },
  { name: "note", type: "text" },
  {
    fields: [
      { name: "heading", type: "text" },
      { fields: [{ name: "caption", type: "text" }], name: "media", type: "group" },
    ],
    localized: true,
    name: "hero",
    type: "group",
  },
  {
    fields: [
      { localized: true, name: "claim", type: "text" },
      {
        fields: [{ name: "text", type: "text" }],
        localized: true,
        name: "legal",
        type: "group",
      },
    ],
    name: "footer",
    type: "group",
  },
  { fields: [{ name: "label", type: "text" }], localized: true, name: "list", type: "array" },
  {
    fields: [
      { localized: true, name: "label", type: "text" },
      { name: "code", type: "text" },
    ],
    name: "links",
    type: "array",
  },
  {
    blocks: [
      {
        fields: [
          { name: "title", type: "text" },
          { fields: [{ name: "label", type: "text" }], name: "items", type: "array" },
        ],
        slug: "cards",
      },
    ],
    localized: true,
    name: "layout",
    type: "blocks",
  },
  {
    tabs: [
      { fields: [{ name: "headline", type: "text" }], localized: true, name: "seo" },
      { fields: [{ localized: true, name: "lead", type: "text" }], label: "Content" },
    ],
    type: "tabs",
  },
  { localized: true, name: "body", type: "richText" },
  { localized: true, name: "image", relationTo: "media", type: "upload" },
  {
    fields: [{ name: "en", type: "text" }],
    localized: true,
    name: "translations",
    type: "group",
  },
] as SchemaField[];

const pagesSchema = buildEditableSchema(pageFields);

const inPageA = { collectionSlug: "pages", docId: "A", kind: "collection" } as const;

const readAsDraft = <T extends object>(page: T, localeCodesKeyingValues: readonly string[]) =>
  markRead(
    { id: "A", ...page },
    { identity: inPageA, instantPreview: true, localeCodesKeyingValues, schema: pagesSchema }
  );

const markEveryLocale = <T extends object>(page: T) => readAsDraft(page, LOCALE_CODES);

const markOneLocale = <T extends object>(page: T) => readAsDraft(page, []);

const markerOf = (text: unknown) => vercelStegaDecode(String(text));

const textOf = (text: unknown) => vercelStegaSplit(String(text)).cleaned;

describe("a document read with every locale", () => {
  it("marks a text keyed by locale with the path of its field and the locale of the value", () => {
    const page = markEveryLocale({ title: { de: "Start", en: "Home" } });

    expect(markerOf(page.title.en)).toEqual({ ...inPageA, locale: "en", path: "title" });
    expect(markerOf(page.title.de)).toEqual({ ...inPageA, locale: "de", path: "title" });
    expect(textOf(page.title.de)).toBe("Start");
    expect(page.title).not.toHaveProperty(META_KEY);
  });

  it("marks the text of a group keyed by locale without the locale in its path", () => {
    const page = markEveryLocale({
      hero: { de: { heading: "Willkommen" }, en: { heading: "Welcome" } },
    });

    expect(markerOf(page.hero.en.heading)).toEqual({
      ...inPageA,
      locale: "en",
      path: "hero.heading",
    });
    expect(markerOf(page.hero.de.heading)).toEqual({
      ...inPageA,
      locale: "de",
      path: "hero.heading",
    });
  });

  it("marks a group nested in a group keyed by locale", () => {
    const page = markEveryLocale({
      hero: { en: { heading: "Welcome", media: { caption: "A harbour" } } },
    });

    expect(markerOf(page.hero.en.media.caption)).toEqual({
      ...inPageA,
      locale: "en",
      path: "hero.media.caption",
    });
  });

  it("marks localized fields below a group that is not localized", () => {
    const page = markEveryLocale({
      footer: { claim: { en: "Since 1999" }, legal: { de: { text: "Impressum" } } },
    });

    expect(markerOf(page.footer.claim.en)).toEqual({
      ...inPageA,
      locale: "en",
      path: "footer.claim",
    });
    expect(markerOf(page.footer.legal.de.text)).toEqual({
      ...inPageA,
      locale: "de",
      path: "footer.legal.text",
    });
  });

  it("marks the rows of an array keyed by locale with their index path and row key", () => {
    const page = markEveryLocale({
      list: { de: [{ id: "row-9", label: "Erste" }], en: [{ id: "row-1", label: "First" }] },
    });

    expect(markerOf(page.list.en[0]?.label)).toEqual({
      ...inPageA,
      key: "list.row-1.label",
      locale: "en",
      path: "list.0.label",
    });
    expect(markerOf(page.list.de[0]?.label)).toEqual({
      ...inPageA,
      key: "list.row-9.label",
      locale: "de",
      path: "list.0.label",
    });
  });

  it("marks a localized text in a row of an array that is not localized", () => {
    const page = markEveryLocale({
      links: [{ code: "Pricing code", id: "link-1", label: { de: "Preise", en: "Pricing" } }],
    });

    expect(markerOf(page.links[0]?.label.de)).toEqual({
      ...inPageA,
      key: "links.link-1.label",
      locale: "de",
      path: "links.0.label",
    });
    expect(markerOf(page.links[0]?.code)).toEqual({
      ...inPageA,
      key: "links.link-1.code",
      path: "links.0.code",
    });
  });

  it("marks blocks keyed by locale down to the rows of their arrays", () => {
    const page = markEveryLocale({
      layout: {
        en: [
          {
            blockType: "cards",
            id: "cards-1",
            items: [{ id: "item-1", label: "Monthly" }],
            title: "Plans",
          },
        ],
      },
    });

    expect(markerOf(page.layout.en[0]?.title)).toEqual({
      ...inPageA,
      key: "layout.cards-1.title",
      locale: "en",
      path: "layout.0.title",
    });
    expect(markerOf(page.layout.en[0]?.items[0]?.label)).toEqual({
      ...inPageA,
      key: "layout.cards-1.items.item-1.label",
      locale: "en",
      path: "layout.0.items.0.label",
    });
  });

  it("marks a named tab keyed by locale and a localized text of an unnamed tab", () => {
    const page = markEveryLocale({ lead: { en: "Read on" }, seo: { en: { headline: "Buy now" } } });

    expect(markerOf(page.seo.en.headline)).toEqual({
      ...inPageA,
      locale: "en",
      path: "seo.headline",
    });
    expect(markerOf(page.lead.en)).toEqual({ ...inPageA, locale: "en", path: "lead" });
  });

  it("addresses the rich text of each locale with the path of its field", () => {
    const page = markEveryLocale({ body: { de: editorState(), en: editorState() } });

    expect(page.body.en).toMatchObject({
      [META_KEY]: { ...inPageA, path: "body", terminal: true },
    });
    expect(page.body.de).toMatchObject({
      [META_KEY]: { ...inPageA, path: "body", terminal: true },
    });
  });

  it("addresses the upload of each locale with the path of its field", () => {
    const page = markEveryLocale({ image: { en: { alt: "A harbour", id: "M" } } });

    expect(page.image.en.alt).toBe("A harbour");
    expect(page.image.en).toMatchObject({
      [META_KEY]: { ...inPageA, path: "image", terminal: true },
    });
  });

  it("leaves a value keyed by something that is not a locale without a marker", () => {
    const page = markEveryLocale({ title: { fr: "Accueil" } });

    expect(page.title).toEqual({ fr: "Accueil" });
  });

  it("marks the fields that are not localized as in any other read", () => {
    const page = markEveryLocale({ note: "Internal" });

    expect(markerOf(page.note)).toEqual({ ...inPageA, path: "note" });
  });
});

describe("a document read in one locale", () => {
  it("marks a localized text without stating a locale", () => {
    const page = markOneLocale({ hero: { heading: "Welcome" }, title: "Home" });

    expect(markerOf(page.title)).toEqual({ ...inPageA, path: "title" });
    expect(markerOf(page.hero.heading)).toEqual({ ...inPageA, path: "hero.heading" });
  });

  it("reads a field named like a locale as a field", () => {
    const page = markOneLocale({ translations: { en: "English" } });

    expect(markerOf(page.translations.en)).toEqual({ ...inPageA, path: "translations.en" });
  });
});

const titleFields: Field[] = [{ localized: true, name: "title", type: "text" }];

const titledConfig = configOf({
  collections: [{ fields: titleFields, slug: "pages" }],
  globals: [{ fields: titleFields, slug: "nav" }],
});

const EVERY_LOCALE = { localeCodes: LOCALE_CODES };

type Titled<Title> = { title: Title };

describe("a draft read through the hooks of the plugin", () => {
  const read = readThroughPlugin(titledConfig);
  const everyLocale = draftReadRequest(titledConfig, { locale: "all", localization: EVERY_LOCALE });

  it("marks the localized text of a collection document per locale", () => {
    const page = read.collectionDocument<Titled<Record<string, string>>>(
      { id: "A", title: { de: "Start", en: "Home" } },
      everyLocale
    );

    expect(markerOf(page.title.de)).toEqual({ ...inPageA, locale: "de", path: "title" });
  });

  it("marks the localized text of a global per locale", () => {
    const nav = read.global<Titled<Record<string, string>>>(
      { title: { de: "Start", en: "Home" } },
      everyLocale
    );

    expect(markerOf(nav.title.en)).toEqual({
      collectionSlug: "nav",
      kind: "global",
      locale: "en",
      path: "title",
    });
  });

  it("marks nothing per locale when the project has no localization", () => {
    const page = read.collectionDocument<Titled<Record<string, string>>>(
      { id: "A", title: { en: "Home" } },
      draftReadRequest(titledConfig, { locale: "all", localization: false })
    );

    expect(page.title).toEqual({ en: "Home" });
  });

  it("states no locale in the marker of a read in one locale", () => {
    const page = read.collectionDocument<Titled<string>>(
      { id: "A", title: "Home" },
      draftReadRequest(titledConfig, { locale: "en", localization: EVERY_LOCALE })
    );

    expect(markerOf(page.title)).toEqual({ ...inPageA, path: "title" });
  });
});
