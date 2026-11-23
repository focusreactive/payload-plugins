import type { Payload } from "payload";

import { describe, expect, it, vi } from "vitest";

import { readUnsavedRichText } from "../../src/index";

const payloadWithoutSchemaCache = () =>
  ({
    auth: vi.fn(),
    collections: { pages: {} },
    config: { custom: {}, globals: [], localization: false },
    db: { defaultIDType: "text" },
    logger: { error: vi.fn(), warn: vi.fn() },
  }) as unknown as Payload;

const request = {
  field: { collectionSlug: "pages", docId: "page-1", key: "body", kind: "collection" },
  state: { root: { children: [], type: "root" } },
};

describe("readUnsavedRichText when config.custom lost the plugin's schema cache", () => {
  it("reads nothing and warns once per Payload", async () => {
    const payload = payloadWithoutSchemaCache();
    const read = () => readUnsavedRichText({ headers: new Headers(), payload, request });

    expect(await read()).toBeNull();
    expect(await read()).toBeNull();

    expect(payload.logger.warn).toHaveBeenCalledTimes(1);
    expect(payload.auth).not.toHaveBeenCalled();
  });
});
