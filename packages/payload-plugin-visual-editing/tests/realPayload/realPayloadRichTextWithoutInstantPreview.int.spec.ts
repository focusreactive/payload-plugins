import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Pages } from "../support/richTextPages";

import { readUnsavedRichText } from "../../src/index";

import { metaAt } from "../support/markedData";
import { START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import { EDITOR, signIn } from "../support/unsavedRichTextRequests";
import { article, page, readMarked, seedPages, textOf } from "../support/richTextPages";

describe("the rich text of a draft read through Payload without instantPreview", () => {
  let payload: Payload;
  let pages: Pages;
  let landing: unknown;

  beforeAll(async () => {
    payload = await startRealPayload({ name: "rich-text-plain" });
    pages = await seedPages(payload);
    landing = await readMarked(payload, pages.landing, 1);
  }, START_TIMEOUT_MS);

  afterAll(() => payload.destroy());

  it("writes no rich text markers", () => {
    expect(textOf(landing, "body")).toBe("Body");
    expect(textOf(landing, "layout.0.body")).toBe("Block body");
    expect(textOf(landing, "list.0.note")).toBe("Row note");
    expect(textOf(landing, "related.body")).toBe("Linked body");
  });

  it("states no key in the _meta of a rich text field in a row", () => {
    expect(metaAt(landing, "layout.0.body")).toEqual({
      ...page(pages.landing),
      path: "layout.0.body",
      terminal: true,
    });
    expect(metaAt(landing, "list.0.note")).toEqual({
      ...page(pages.landing),
      path: "list.0.note",
      terminal: true,
    });
  });

  it("reads no unsaved rich text state", async () => {
    const editor = await signIn(payload, EDITOR);
    const body = { field: { ...page(pages.landing), key: "body" }, state: article() };

    const content = await readUnsavedRichText({ headers: editor, payload, request: body });

    expect(content).toBeNull();
  });
});
