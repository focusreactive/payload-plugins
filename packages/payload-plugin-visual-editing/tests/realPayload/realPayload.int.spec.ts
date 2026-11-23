import type { Payload } from "payload";

import { createLocalReq } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ResolverField } from "../../src/admin/resolveContainerChain";
import type { Site } from "../support/realPayload";

import { resolveContainerChain } from "../../src/admin/resolveContainerChain";

import { everyMarkedTextIn, everyMetaIn, markersAt, metaAt, valueAt } from "../support/markedData";
import { seedSite, START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import { page } from "../support/richTextPages";

const readHome = (payload: Payload, site: Site, depth: number) =>
  payload.findByID({ collection: "pages", depth, draft: true, id: site.home });

describe("a draft read through Payload", () => {
  let payload: Payload;
  let site: Site;
  let home: unknown;
  const pagesReadBeforeThePlugin: Record<string, unknown>[] = [];

  beforeAll(async () => {
    payload = await startRealPayload({
      name: "markers",
      onPageReadBeforeThePlugin: (doc) => pagesReadBeforeThePlugin.push(structuredClone(doc)),
    });
    site = await seedSite(payload);
    pagesReadBeforeThePlugin.length = 0;
    home = await readHome(payload, site, 2);
  }, START_TIMEOUT_MS);

  afterAll(() => payload.destroy());

  it("marks the text fields of the document with their path", () => {
    expect(markersAt(home, "title")).toEqual([{ ...page(site.home), path: "title" }]);
    expect(markersAt(home, "label")).toEqual([{ ...page(site.home), path: "label" }]);
    expect(markersAt(home, "seo.description")).toEqual([
      { ...page(site.home), path: "seo.description" },
    ]);
  });

  it("leaves a field the editor cannot change in the admin without a marker", () => {
    expect(valueAt(home, "reference")).toBe("REF-1");
    expect(valueAt(home, "legacy")).toBe("Legacy text");
  });

  it("leaves the text of an excluded group without a marker", () => {
    expect(valueAt(home, "internal.label")).toBe("Internal label");
  });

  it("marks a block declared through blockReferences with its index path", () => {
    expect(markersAt(home, "sections.0.quote")).toEqual([
      { ...page(site.home), path: "sections.0.quote" },
    ]);
  });

  it("marks the fields of array rows and blocks with their index path, the block name included", () => {
    expect(markersAt(home, "list.1.label")).toEqual([{ ...page(site.home), path: "list.1.label" }]);
    expect(markersAt(home, "layout.0.heading")).toEqual([
      { ...page(site.home), path: "layout.0.heading" },
    ]);
    expect(markersAt(home, "layout.0.blockName")).toEqual([
      { ...page(site.home), path: "layout.0.blockName" },
    ]);
  });

  it("marks the documents of a find like the document of a findByID", async () => {
    const { docs } = await payload.find({
      collection: "pages",
      depth: 0,
      draft: true,
      where: { id: { equals: site.home } },
    });

    expect(markersAt(docs[0], "title")).toEqual([{ ...page(site.home), path: "title" }]);
  });

  it("leaves the rich text of the document a _meta that addresses its field", () => {
    expect(metaAt(home, "body")).toEqual({ ...page(site.home), path: "body", terminal: true });
  });

  describe("with a populated document of a collection the plugin marks", () => {
    it("receives that document already marked and without a _meta of its own", () => {
      const homeBeforeThePlugin = pagesReadBeforeThePlugin.find(
        (doc) => String(doc.id) === site.home
      );

      expect(markersAt(homeBeforeThePlugin, "related.title")).toEqual([
        { ...page(site.about), path: "title" },
      ]);
      expect(markersAt(homeBeforeThePlugin, "related.layout.0.heading")).toEqual([
        { ...page(site.about), path: "layout.0.heading" },
      ]);
      expect(metaAt(homeBeforeThePlugin, "related")).toBeUndefined();
      expect(metaAt(homeBeforeThePlugin, "related.layout.0")).toBeUndefined();
    });

    it("marks its fields once, as fields of that document", () => {
      expect(markersAt(home, "related.title")).toEqual([{ ...page(site.about), path: "title" }]);
      expect(markersAt(home, "related.layout.0.heading")).toEqual([
        { ...page(site.about), path: "layout.0.heading" },
      ]);
      expect(markersAt(home, "related.layout.0.blockName")).toEqual([
        { ...page(site.about), path: "layout.0.blockName" },
      ]);
    });

    it("marks a document populated two levels down as itself", () => {
      expect(markersAt(home, "related.related.list.0.label")).toEqual([
        { ...page(site.contact), path: "list.0.label" },
      ]);
    });

    it("leaves it a _meta that addresses the relationship field of the document that relates to it", () => {
      expect(metaAt(home, "related")).toEqual({
        ...page(site.home),
        path: "related",
        terminal: true,
      });
      expect(metaAt(home, "related.related")).toEqual({
        ...page(site.about),
        path: "related",
        terminal: true,
      });
      expect(metaAt(home, "layout.0.picked")).toEqual({
        ...page(site.home),
        path: "layout.0.picked",
        terminal: true,
      });
    });

    it("marks the document behind a relationship to several collections as itself", () => {
      expect(markersAt(home, "eitherOne.value.name")).toEqual([
        { collectionSlug: "authors", docId: site.author, kind: "collection", path: "name" },
      ]);
    });

    it("addresses the relationship field from the value of a relationship to several collections and from the document in it", () => {
      const ofField = { ...page(site.home), path: "eitherOne", terminal: true };

      expect(metaAt(home, "eitherOne")).toEqual(ofField);
      expect(metaAt(home, "eitherOne.value")).toEqual(ofField);
    });

    it("addresses the relationship field from every entry of a hasMany relationship to several collections and from the document in it", () => {
      const ofField = { ...page(site.home), path: "eitherMany", terminal: true };

      expect(metaAt(home, "eitherMany.0")).toEqual(ofField);
      expect(metaAt(home, "eitherMany.0.value")).toEqual(ofField);
      expect(metaAt(home, "eitherMany.1")).toEqual(ofField);
      expect(metaAt(home, "eitherMany.1.value")).toEqual(ofField);
    });

    it("addresses the relationship field from every entry of a hasMany relationship to several collections that is not populated", async () => {
      const unpopulated = await readHome(payload, site, 0);
      const ofField = { ...page(site.home), path: "eitherMany", terminal: true };

      expect(valueAt(unpopulated, "eitherMany.1.value")).toEqual(expect.any(Number));
      expect(metaAt(unpopulated, "eitherMany.0")).toEqual(ofField);
      expect(metaAt(unpopulated, "eitherMany.1")).toEqual(ofField);
    });

    it("addresses the relationship field from every document of a hasMany relationship", () => {
      const ofField = { ...page(site.home), path: "relatedMany", terminal: true };

      expect(metaAt(home, "relatedMany.0")).toEqual(ofField);
      expect(metaAt(home, "relatedMany.1")).toEqual(ofField);
      expect(markersAt(home, "relatedMany.1.title")).toEqual([
        { ...page(site.contact), path: "title" },
      ]);
    });
  });

  describe("with a populated document of a skipped collection", () => {
    it("marks none of its text", () => {
      expect(valueAt(home, "plainAuthor.name")).toBe("Paul");
      expect(valueAt(home, "plainAuthor.links.0.label")).toBe("Plain blog");
      expect(valueAt(home, "plainAuthors.0.name")).toBe("Paul");
    });

    it("leaves it a _meta that addresses the relationship field and none inside it", () => {
      expect(metaAt(home, "plainAuthor")).toEqual({
        ...page(site.home),
        path: "plainAuthor",
        terminal: true,
      });
      expect(metaAt(home, "plainAuthor.links.0")).toBeUndefined();
      expect(metaAt(home, "plainAuthors.0")).toEqual({
        ...page(site.home),
        path: "plainAuthors",
        terminal: true,
      });
    });

    it("marks a document of a marked collection nested in it as itself and leaves that one no _meta", () => {
      expect(markersAt(home, "plainAuthor.favourite.title")).toEqual([
        { ...page(site.contact), path: "title" },
      ]);
      expect(metaAt(home, "plainAuthor.favourite")).toBeUndefined();
    });
  });

  describe("with a populated upload", () => {
    it("marks the text of the media document as fields of that document", () => {
      expect(markersAt(home, "image.alt")).toEqual([
        { collectionSlug: "media", docId: site.photo, kind: "collection", path: "alt" },
      ]);
      expect(markersAt(home, "image.credits.0.name")).toEqual([
        { collectionSlug: "media", docId: site.photo, kind: "collection", path: "credits.0.name" },
      ]);
    });

    it("leaves it a _meta that addresses the upload field of the document that holds it", () => {
      expect(metaAt(home, "image")).toEqual({ ...page(site.home), path: "image", terminal: true });
      expect(metaAt(home, "layout.0.image")).toEqual({
        ...page(site.home),
        path: "layout.0.image",
        terminal: true,
      });
    });

    it("addresses the upload field from every document of a hasMany upload", () => {
      expect(metaAt(home, "gallery.0")).toEqual({
        ...page(site.home),
        path: "gallery",
        terminal: true,
      });
    });

    it("addresses the upload field from the value of an upload to several collections and from the document in it", () => {
      const ofField = { ...page(site.home), path: "eitherFile", terminal: true };

      expect(metaAt(home, "eitherFile")).toEqual(ofField);
      expect(metaAt(home, "eitherFile.value")).toEqual(ofField);
    });
  });

  describe("with a populated upload of a skipped collection", () => {
    it("marks none of its text", () => {
      expect(valueAt(home, "brochure.alt")).toBe("Brochure");
      expect(valueAt(home, "brochure.credits.0.name")).toBe("Bea");
    });

    it("leaves it a _meta that addresses the upload field and none inside it", () => {
      expect(metaAt(home, "brochure")).toEqual({
        ...page(site.home),
        path: "brochure",
        terminal: true,
      });
      expect(metaAt(home, "brochure.credits.0")).toBeUndefined();
    });
  });

  it("leaves no _meta on a relationship or upload that was not populated", async () => {
    const unpopulated = await readHome(payload, site, 0);

    expect(valueAt(unpopulated, "related")).toBe(Number(site.about));
    expect(valueAt(unpopulated, "image")).toBe(Number(site.photo));
    expect(markersAt(unpopulated, "title")).toEqual([{ ...page(site.home), path: "title" }]);
  });

  it("gives every _meta a path the admin resolves to a field of the form", () => {
    const fieldsOf = (collectionSlug: string) =>
      payload.collections[collectionSlug]?.config.fields as ResolverField[];

    const unresolved = everyMetaIn(home).filter(({ meta }) => {
      const { collectionSlug, path } = meta as { collectionSlug: string; path: string };
      return !resolveContainerChain(path, fieldsOf(collectionSlug))?.fieldId;
    });

    expect(unresolved).toEqual([]);
  });

  it("marks a global with its slug and no document id", async () => {
    const settings = await payload.findGlobal({ depth: 1, draft: true, slug: "settings" });
    const inSettings = { collectionSlug: "settings", kind: "global" };

    expect(markersAt(settings, "siteName")).toEqual([{ ...inSettings, path: "siteName" }]);
    expect(markersAt(settings, "nav.0.label")).toEqual([{ ...inSettings, path: "nav.0.label" }]);
    expect(markersAt(settings, "nav.0.page.title")).toEqual([
      { ...page(site.about), path: "title" },
    ]);
    expect(metaAt(settings, "nav.0.page")).toEqual({
      ...inSettings,
      path: "nav.0.page",
      terminal: true,
    });
  });

  it.each([0, 1])("marks a draft read of a global at depth %i", async (depth) => {
    const settings = await payload.findGlobal({ depth, draft: true, slug: "settings" });

    expect(markersAt(settings, "siteName")).toEqual([
      { collectionSlug: "settings", kind: "global", path: "siteName" },
    ]);
  });

  it.each([0, 1])("marks nothing in a published read of a global at depth %i", async (depth) => {
    const settings = await payload.findGlobal({ depth, slug: "settings" });

    expect(everyMarkedTextIn(settings)).toEqual([]);
    expect(everyMetaIn(settings)).toEqual([]);
  });

  it("marks nothing in a published read of a global after a draft read in the same request", async () => {
    const req = await createLocalReq({}, payload);
    await payload.findByID({ collection: "pages", depth: 1, draft: true, id: site.home, req });

    const settings = await payload.findGlobal({ depth: 1, req, slug: "settings" });

    expect(everyMarkedTextIn(settings)).toEqual([]);
  });

  it("marks nothing in the versions read after a draft read in the same request", async () => {
    const req = await createLocalReq({}, payload);
    await payload.findByID({ collection: "pages", depth: 1, draft: true, id: site.home, req });

    const versions = await payload.findVersions({ collection: "pages", depth: 0, req });

    expect(everyMarkedTextIn(versions.docs)).toEqual([]);
    expect(everyMetaIn(versions.docs)).toEqual([]);
  });

  it("marks nothing in a read that is not a draft read", async () => {
    const published = await payload.findByID({ collection: "pages", depth: 2, id: site.home });

    expect(everyMarkedTextIn(published)).toEqual([]);
    expect(everyMetaIn(published)).toEqual([]);
  });

  describe("with every locale", () => {
    let everyLocale: unknown;

    beforeAll(async () => {
      everyLocale = await payload.findByID({
        collection: "pages",
        depth: 1,
        draft: true,
        id: site.home,
        locale: "all",
      });
    });

    it("marks the value of each locale with the path of its field and its locale", () => {
      expect(markersAt(everyLocale, "title.en")).toEqual([
        { ...page(site.home), locale: "en", path: "title" },
      ]);
      expect(markersAt(everyLocale, "title.de")).toEqual([
        { ...page(site.home), locale: "de", path: "title" },
      ]);
      expect(markersAt(everyLocale, "localizedList.de.0.label")).toEqual([
        { ...page(site.home), locale: "de", path: "localizedList.0.label" },
      ]);
    });

    it("marks a field that is not localized as in any other read", () => {
      expect(markersAt(everyLocale, "label")).toEqual([{ ...page(site.home), path: "label" }]);
    });

    it("marks the localized fields of a populated document with their locale", () => {
      expect(markersAt(everyLocale, "related.title.en")).toEqual([
        { ...page(site.about), locale: "en", path: "title" },
      ]);
    });

    it("leaves the rich text, upload and related document of each locale a _meta with the path of the field and the locale", () => {
      const inEnglish = { ...page(site.home), locale: "en", terminal: true };

      expect(metaAt(everyLocale, "localizedBody.en")).toEqual({
        ...inEnglish,
        path: "localizedBody",
      });
      expect(metaAt(everyLocale, "localizedImage.en")).toEqual({
        ...inEnglish,
        path: "localizedImage",
      });
      expect(metaAt(everyLocale, "localizedRelated.en")).toEqual({
        ...inEnglish,
        path: "localizedRelated",
      });
      expect(markersAt(everyLocale, "localizedImage.en.alt")).toEqual([
        { collectionSlug: "media", docId: site.photo, kind: "collection", path: "alt" },
      ]);
    });

    it("states no locale in the _meta of a field that is not localized", () => {
      expect(metaAt(everyLocale, "body")).toEqual({
        ...page(site.home),
        path: "body",
        terminal: true,
      });
    });
  });
});
