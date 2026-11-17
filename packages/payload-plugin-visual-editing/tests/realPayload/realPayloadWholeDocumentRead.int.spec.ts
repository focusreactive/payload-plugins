import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Site } from "../support/savedRichTextSite";

import { START_TIMEOUT_MS } from "../support/realPayload";
import { article, page, topLevelTypesOf } from "../support/richTextPages";
import { fieldsOfTheLastRead, readThroughEndpoint, startSite } from "../support/savedRichTextSite";

describe("the unsaved rich text endpoint of a plugin told to read the whole document", () => {
  let site: Site;

  beforeAll(async () => {
    site = await startSite("whole-document-read", {
      instantPreview: true,
      readWholeDocument: true,
    });
  }, START_TIMEOUT_MS);

  afterAll(() => site.payload.destroy());

  it("reads every field of the document", async () => {
    const request = {
      field: { ...page(site.pages.landing), key: "body" },
      locale: "en",
      state: article(),
    };

    const content = await readThroughEndpoint(site, request);

    expect(topLevelTypesOf(content)).toEqual(["paragraph", "paragraph", "list"]);
    expect(fieldsOfTheLastRead(site)).toContain("title");
  });
});
