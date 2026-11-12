import { vercelStegaClean } from "@vercel/stega";
import { describe, expect, it } from "vitest";

import { stripMarkers } from "../../src/index";
import { markTextLeaves } from "../../src/server/richText/markTextLeaves";

import { markedText } from "../support/markedData";
import { paragraphsOf } from "../support/editorState";

const marked = (text: string, path: string) =>
  markedText(text, { collectionSlug: "pages", kind: "collection", path });

const STORED_BODY = paragraphsOf(["Hello ", "world"], ["Second"]);

const draftReadOfBody = () => {
  const body = structuredClone(STORED_BODY);
  markTextLeaves(body, "pages:1:body");
  return body;
};

describe("stripMarkers", () => {
  it("gives the visible text of a marked string", () => {
    expect(stripMarkers(marked("Hello world", "title"))).toBe("Hello world");
  });

  it("gives a string without a marker back as it is", () => {
    expect(stripMarkers("Hello world")).toBe("Hello world");
  });

  it("gives the stored rich text for the rich text of a draft read", () => {
    const body = draftReadOfBody();

    expect(body).not.toEqual(STORED_BODY);
    expect(stripMarkers(body)).toEqual(STORED_BODY);
  });

  it("cleans the strings of nested objects and arrays", () => {
    const page = {
      layout: [
        { blockType: "hero", items: [{ label: marked("Feature", "layout.0.items.0.label") }] },
      ],
      tags: [marked("News", "tags.0")],
      title: marked("Home", "title"),
    };

    expect(stripMarkers(page)).toEqual({
      layout: [{ blockType: "hero", items: [{ label: "Feature" }] }],
      tags: ["News"],
      title: "Home",
    });
  });

  it("leaves the value it was given as it was", () => {
    const body = draftReadOfBody();
    const before = structuredClone(body);

    stripMarkers(body);

    expect(body).toEqual(before);
  });

  it("keeps every value that is not a string", () => {
    const publishedAt = new Date("2026-01-01T00:00:00.000Z");
    const page = { count: 42, enabled: true, missing: null, publishedAt, unset: undefined };

    const cleaned = stripMarkers(page);

    expect(cleaned).toEqual(page);
    expect(cleaned.publishedAt).toBe(publishedAt);
    expect(stripMarkers(null)).toBeNull();
    expect(stripMarkers(undefined)).toBeUndefined();
    expect(stripMarkers(7)).toBe(7);
  });

  it("gives a Map, a Set and a class instance back as they are", () => {
    class Seo {
      title = marked("Home", "title");
    }
    const page = { seo: new Seo(), tags: new Set([marked("News", "tags")]), texts: new Map() };

    const cleaned = stripMarkers(page);

    expect(cleaned.seo).toBe(page.seo);
    expect(cleaned.tags).toBe(page.tags);
    expect(cleaned.texts).toBe(page.texts);
  });

  it("gives what vercelStegaClean gives for a JSON value", () => {
    const page = { body: draftReadOfBody(), title: marked("Home", "title") };

    expect(stripMarkers(page)).toEqual(vercelStegaClean(page));
  });
});
