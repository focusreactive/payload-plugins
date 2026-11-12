import { vercelStegaDecode } from "@vercel/stega";
import { describe, expect, it } from "vitest";

import type { ReadOfDocument } from "../../src/server/markRead";
import type { PlainObject } from "../../src/shared/plainObject";

import { defaultExcludeValues, isUrl } from "../../src/excludeValues";
import { markRead } from "../../src/server/markRead";
import { isPlainObject } from "../../src/shared/plainObject";
import { META_KEY } from "../../src/shared/shared";

import { paragraphsOf } from "../support/editorState";

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

const markerOf = (text: unknown) => vercelStegaDecode(String(text));

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
    expect(markerOf(page.description)).toEqual({ ...inPage, path: "description" });
    expect(markerOf(page.contact)).toEqual({ ...inPage, path: "contact" });
    expect(markerOf(page.hero.heading)).toEqual({ ...inPage, path: "hero.heading" });
    expect(fieldReferenceOf(page)).toBeUndefined();
    expect(fieldReferenceOf(page.hero)).toBeUndefined();
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
