import { describe, expect, it } from "vitest";

import type { ReadOfDocument } from "../../src/server/markRead";
import type { PlainObject } from "../../src/shared/plainObject";

import type { Field } from "payload";

import { defaultExcludeValues, isUrl } from "../../src/excludeValues";
import { markRead } from "../../src/server/markRead";
import { buildEditableSchema } from "../../src/shared/editableSchema/editableSchema";
import { isPlainObject } from "../../src/shared/plainObject";
import { META_KEY, toStegaPayload } from "../../src/shared/shared";
import { withMarker, withoutMarker } from "../../src/shared/stegaText";

import { paragraphsOf } from "../support/editorState";
import { markerIn } from "../support/markedData";

const inPage = { collectionSlug: "pages", docId: "p-1", kind: "collection" } as const;

const pagesSchema = {
  body: "richText",
  contact: "email",
  description: "textarea",
  gallery: "upload",
  hero: { heading: "text" },
  image: "upload",
  items: { label: "text" },
  sections: { copy: { text: "text" }, hero: { heading: { level: "select", text: "text" } } },
  subtitle: "text",
  title: "text",
};

const markPage = <Document extends PlainObject>(
  page: Document,
  read: Partial<ReadOfDocument> = {}
) => markRead(page, { identity: inPage, schema: pagesSchema, ...read });

const markerOf = (text: unknown) => markerIn(String(text));

const fieldReferenceOf = (value: unknown) => (isPlainObject(value) ? value[META_KEY] : undefined);

describe("a marked read", () => {
  it("marks every text, textarea and email field with its path and the document", () => {
    const page = markPage({
      contact: "hello@example.com",
      description: "A longer body of prose.",
      hero: { heading: "Inner" },
      id: "p-1",
      title: "80%",
    });

    expect(markerOf(page.title)).toEqual({ ...inPage, path: "title" });
    expect(markerOf(page.description)).toEqual({ ...inPage, multiline: true, path: "description" });
    expect(markerOf(page.contact)).toEqual({ ...inPage, path: "contact" });
    expect(markerOf(page.hero.heading)).toEqual({ ...inPage, path: "hero.heading" });
    expect(fieldReferenceOf(page)).toBeUndefined();
    expect(fieldReferenceOf(page.hero)).toBeUndefined();
  });

  it("says of a textarea alone that it holds several lines", () => {
    const page = markPage({
      contact: "hello@example.com",
      description: "Two\nlines",
      sections: [{ blockType: "copy", id: "d", text: "Body" }],
      title: "Hi",
    });

    expect(markerOf(page.description)).toHaveProperty("multiline", true);
    expect(
      [page.title, page.contact, page.sections[0]?.text].map((text) => markerOf(text))
    ).not.toContainEqual(expect.objectContaining({ multiline: true }));
  });

  it("leaves blank text without a marker", () => {
    const page = markPage({ description: "   \n\t  ", subtitle: "", title: "Real heading" });

    expect(page.subtitle).toBe("");
    expect(page.description).toBe("   \n\t  ");
  });

  it("gives back a copy and leaves the document it was given as it was", () => {
    const document = { hero: { heading: "Inner" }, title: "Hi" };
    const page = markPage(document);

    expect(page).not.toBe(document);
    expect(document).toEqual({ hero: { heading: "Inner" }, title: "Hi" });
  });

  it("marks the text of every row of the only list a document holds", () => {
    const page = markPage({
      sections: [
        { blockType: "hero", heading: { level: "h1", text: "Welcome" }, id: "c" },
        { blockType: "copy", id: "d", text: "Body" },
      ],
      title: "Hi",
    });

    expect(markerOf(page.sections[0]?.heading?.text)).toEqual({
      ...inPage,
      path: "sections.0.heading.text",
    });
    expect(page.sections[0]?.heading?.level).toBe("h1");
    expect(markerOf(page.sections[1]?.text)).toEqual({ ...inPage, path: "sections.1.text" });
  });

  it("addresses a rich text field without marking the text in it", () => {
    const body = paragraphsOf(["Hello"]);
    const page = markPage({ body, title: "Hi" });

    expect(fieldReferenceOf(page.body)).toEqual({ ...inPage, path: "body", terminal: true });
    expect(fieldReferenceOf(page.body.root)).toBeUndefined();
    expect(fieldReferenceOf(page.body.root.children[0])).toBeUndefined();
    expect(page.body.root).toEqual(body.root);
  });

  it("leaves a value that already addresses a field as it is", () => {
    const related = { [META_KEY]: { ...inPage, path: "question" }, question: "Q?" };
    const page = markPage({ related, title: "Page" });

    expect(page.related).toBe(related);
  });

  it("writes no document id for a global", () => {
    const settings = markRead(
      { title: "Site" },
      { identity: { collectionSlug: "settings", kind: "global" }, schema: { title: "text" } }
    );

    expect(markerOf(settings.title)).toEqual({
      collectionSlug: "settings",
      kind: "global",
      path: "title",
    });
  });

  it("marks nothing for a document without a schema", () => {
    expect(markPage({ title: "Hi" }, { schema: null })).toEqual({ title: "Hi" });
  });

  describe("with a populated upload", () => {
    it("addresses the upload field of the document that holds it", () => {
      const page = markPage({ image: { alt: "An image", id: "m-1" }, title: "Hi" });

      expect(fieldReferenceOf(page.image)).toEqual({ ...inPage, path: "image", terminal: true });
      expect(page.image.alt).toBe("An image");
    });

    it("addresses the field from every document of a hasMany upload", () => {
      const page = markPage({
        gallery: [
          { alt: "First", id: "m-1" },
          { alt: "Second", id: "m-2" },
        ],
      });

      expect(page.gallery.map(fieldReferenceOf)).toEqual([
        { ...inPage, path: "gallery", terminal: true },
        { ...inPage, path: "gallery", terminal: true },
      ]);
    });

    it("addresses the field from the value of an upload to several collections and from the document in it", () => {
      const page = markPage({ image: { relationTo: "media", value: { alt: "pic", id: "m-2" } } });

      expect(fieldReferenceOf(page.image)).toEqual({ ...inPage, path: "image", terminal: true });
      expect(fieldReferenceOf(page.image.value)).toEqual({
        ...inPage,
        path: "image",
        terminal: true,
      });
      expect(page.image.value.alt).toBe("pic");
    });
  });

  describe("with an image of an upload field", () => {
    const inMedia = { collectionSlug: "media", docId: "m-1", kind: "collection" } as const;
    const mediaAlt = (alt: string) => withMarker(alt, toStegaPayload({ ...inMedia, path: "alt" }));
    const schema = buildEditableSchema([
      { name: "image", relationTo: "media", type: "upload" },
      { name: "gallery", hasMany: true, relationTo: "media", type: "upload" },
      {
        name: "layout",
        type: "blocks",
        blocks: [
          { slug: "hero", fields: [{ name: "image", relationTo: "media", type: "upload" }] },
        ],
      },
    ] as Field[]);
    const markWithUploads = <Document extends PlainObject>(
      page: Document,
      read: Partial<ReadOfDocument> = {}
    ) => markPage(page, { schema, ...read });

    it("describes the image by the field of the page, with the id of the media", () => {
      const page = markWithUploads({ image: { alt: mediaAlt("A lighthouse"), id: "m-1" } });

      expect(withoutMarker(page.image.alt)).toBe("A lighthouse");
      expect(markerOf(page.image.alt)).toEqual({ ...inPage, path: "image", valueId: "m-1" });
    });

    it("names the row of a block the image is in", () => {
      const page = markWithUploads(
        { layout: [{ blockType: "hero", id: "row-1", image: { alt: "Sea", id: 7 } }] },
        { instantPreview: true }
      );

      expect(markerOf(page.layout[0]?.image.alt)).toEqual({
        ...inPage,
        key: "layout.row-1.image",
        path: "layout.0.image",
        valueId: "7",
      });
    });

    it("describes an image without a description too", () => {
      const page = markWithUploads({ image: { alt: null, id: "m-1" } });

      expect(withoutMarker(String(page.image.alt))).toBe("");
      expect(markerOf(page.image.alt)).toEqual({ ...inPage, path: "image", valueId: "m-1" });
    });

    it("reads the description from the field the media names it in", () => {
      const page = markWithUploads(
        { image: { caption: "A lighthouse", id: "m-1" } },
        { imageDescriptionField: "caption" }
      );

      expect(markerOf(page.image.caption)).toEqual({ ...inPage, path: "image", valueId: "m-1" });
    });

    it("leaves the images of a hasMany upload described by their media", () => {
      const page = markWithUploads({ gallery: [{ alt: mediaAlt("First"), id: "m-1" }] });

      expect(markerOf(page.gallery[0]?.alt)).toEqual({ ...inMedia, path: "alt" });
    });
  });

  describe("with excludeValues", () => {
    const titleOf = (title: string, excludeValues = defaultExcludeValues) =>
      markPage({ title }, { excludeValues }).title;

    it("leaves a value that matches a default without a marker", () => {
      expect(titleOf("https://example.com")).toBe("https://example.com");
    });

    it("replaces the defaults with the list it is given", () => {
      expect(markerOf(titleOf("hello-world", [isUrl]))).toEqual({ ...inPage, path: "title" });
    });
  });
});
