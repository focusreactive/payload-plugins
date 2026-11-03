import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";

const get = (harness: TestPayload, path: string, anonymous = false) =>
  callEndpoint<{ errors?: Array<{ message: string }>; url?: string }>({
    anonymous,
    config: harness.config,
    path,
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
  });

describe("GET /folders-tree/preview-url with a builder", () => {
  let harness: TestPayload;

  beforeAll(async () => {
    harness = await getTestPayload({
      foldersOptions: {
        admin: {
          previewUrl: ({ collection, fullPath, locale }) =>
            `https://preview.example.test/${collection}${fullPath}?locale=${locale ?? ""}`,
        },
      },
    });
  });

  afterAll(async () => {
    await harness?.destroy();
  });

  it("answers the host's link for a path", async () => {
    const { body, status } = await get(
      harness,
      "/folders-tree/preview-url?collection=pages&fullPath=/company/contact&locale=de"
    );

    expect(status).toBe(200);
    expect(body.url).toBe("https://preview.example.test/pages/company/contact?locale=de");
  });

  it("passes no locale as null", async () => {
    const { body } = await get(
      harness,
      "/folders-tree/preview-url?collection=pages&fullPath=/about"
    );

    expect(body.url).toBe("https://preview.example.test/pages/about?locale=");
  });

  it("refuses a collection that is not a page collection, a path without a slash, and a visitor", async () => {
    expect(
      (await get(harness, "/folders-tree/preview-url?collection=users&fullPath=/a")).status
    ).toBe(400);
    expect(
      (await get(harness, "/folders-tree/preview-url?collection=pages&fullPath=a")).status
    ).toBe(400);
    expect(
      (await get(harness, "/folders-tree/preview-url?collection=pages&fullPath=/a", true)).status
    ).toBe(403);
  });
});

describe("GET /folders-tree/preview-url without a builder", () => {
  let harness: TestPayload;

  beforeAll(async () => {
    harness = await getTestPayload();
  });

  afterAll(async () => {
    await harness?.destroy();
  });

  it("answers 404, the same as no link", async () => {
    const { status } = await get(
      harness,
      "/folders-tree/preview-url?collection=pages&fullPath=/about"
    );

    expect(status).toBe(404);
  });
});
