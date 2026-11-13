import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { Pages } from "../support/richTextPages";

import { readUnsavedRichText } from "../../src/index";

import { START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import { article, page, seedPages } from "../support/richTextPages";
import { EDITOR, signIn } from "../support/unsavedRichTextRequests";

describe("an unsaved rich text state of a field the plugin excludes", () => {
  let payload: Payload;
  let pages: Pages;
  let editor: Headers;

  beforeAll(async () => {
    payload = await startRealPayload({
      name: "unsaved-rich-text-excluded-field",
      plugin: { excludeFieldNames: ["body"], instantPreview: true },
    });
    pages = await seedPages(payload);
    editor = await signIn(payload, EDITOR);
  }, START_TIMEOUT_MS);

  afterAll(() => payload.destroy());

  it("is refused before the document is read", async () => {
    const findByID = vi.spyOn(payload, "findByID");

    const content = await readUnsavedRichText({
      headers: editor,
      payload,
      request: { field: { ...page(pages.landing), key: "body" }, locale: "en", state: article() },
    });

    expect(content).toBeNull();
    expect(findByID).not.toHaveBeenCalled();
  });
});
