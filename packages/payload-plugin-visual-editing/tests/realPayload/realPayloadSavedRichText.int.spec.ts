import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Site } from "../support/savedRichTextSite";

import { readUnsavedRichText } from "../../src/index";

import { valueAt } from "../support/markedData";
import { richText, START_TIMEOUT_MS } from "../support/realPayload";
import { article, page, readMarked, topLevelTypesOf } from "../support/richTextPages";
import { fieldsOfTheLastRead, readThroughEndpoint, startSite } from "../support/savedRichTextSite";

describe("a rich text field read for the preview page", () => {
  let site: Site;

  const bodyOf = (docId: string, key = "body") => ({
    field: { ...page(docId), key },
    locale: "en",
  });

  const read = (request: unknown, headers = site.editor) =>
    readUnsavedRichText({ depth: 0, headers, payload: site.payload, request });

  beforeAll(async () => {
    site = await startSite("saved-rich-text", { instantPreview: true });
  }, START_TIMEOUT_MS);

  afterAll(() => site.payload.destroy());

  describe("without a state", () => {
    it("is the saved value of the field with the markers of a draft read", async () => {
      const saved = await readMarked(site.payload, site.pages.article);

      const content = await read(bodyOf(site.pages.article));

      expect(content).toEqual(valueAt(saved, "body"));
    });

    it("is read through the endpoint for the document of the grant", async () => {
      const saved = await readMarked(site.payload, site.pages.article, 1);

      const content = await readThroughEndpoint(site, bodyOf(site.pages.article));

      expect(content).toEqual(valueAt(saved, "body"));
    });

    it("is the saved value of every block when the page asks for them at once", async () => {
      const bodies = ["First block", "Second block", "Third block", "Fourth block"];
      const created = await site.payload.create({
        collection: "pages",
        data: {
          layout: bodies.map((body) => ({
            blockType: "hero",
            body: richText(body),
            heading: body,
          })),
          title: "Blocks",
        },
        draft: true,
      });
      const saved = await readMarked(site.payload, String(created.id));
      const keys = bodies.map((_, row) => `layout.${valueAt(saved, `layout.${row}.id`)}.body`);

      const contents = await Promise.all(
        keys.map((key) => readThroughEndpoint(site, bodyOf(String(created.id), key)))
      );

      expect(contents).toEqual(bodies.map((_, row) => valueAt(saved, `layout.${row}.body`)));
    });

    it("is nothing for a user who may not read the document", async () => {
      expect(await read(bodyOf(site.pages.article), site.outsider)).toBeNull();
    });

    it("is nothing for a field without a value", async () => {
      expect(await read(bodyOf(site.pages.landing, "localizedBody"))).not.toBeNull();
      expect(await read(bodyOf(site.pages.article, "localizedBody"))).toBeNull();
    });

    it("is nothing for a state that is not an editor state", async () => {
      expect(await read({ ...bodyOf(site.pages.article), state: null })).toBeNull();
    });
  });

  describe("reads only the top-level field that holds the rich text", () => {
    it("for a field of the document", async () => {
      const content = await read({ ...bodyOf(site.pages.landing), state: article() });

      expect(topLevelTypesOf(content)).toEqual(["paragraph", "paragraph", "list"]);
      expect(fieldsOfTheLastRead(site)).toContain("body");
      expect(fieldsOfTheLastRead(site)).not.toContain("title");
    });

    it("for a field in a block", async () => {
      const saved = await readMarked(site.payload, site.pages.landing);
      const blockId = valueAt(saved, "layout.1.id") as string;

      const content = await read({
        ...bodyOf(site.pages.landing, `layout.${blockId}.body`),
        state: article(),
      });

      expect(topLevelTypesOf(content)).toEqual(["paragraph", "paragraph", "list"]);
      expect(fieldsOfTheLastRead(site)).toContain("layout");
      expect(fieldsOfTheLastRead(site)).not.toContain("body");
    });

    it("for the saved value", async () => {
      await read(bodyOf(site.pages.landing));

      expect(fieldsOfTheLastRead(site)).not.toContain("title");
    });
  });

  it("reads the whole document when readUnsavedRichText is told to", async () => {
    await readUnsavedRichText({
      headers: site.editor,
      payload: site.payload,
      readWholeDocument: true,
      request: { ...bodyOf(site.pages.landing), state: article() },
    });

    expect(fieldsOfTheLastRead(site)).toContain("title");
  });
});
