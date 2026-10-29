import { createPayloadRequest } from "payload";
import type { Config, Payload, PayloadRequest } from "payload";

import { normalizeOptions } from "../../src/options.js";
import type { FoldersPluginOptions, ResolvedOptions } from "../../src/types.js";
import type { TestPayload } from "./getTestPayload.js";

/**
 * The dev app's plugin options, resolved the way the plugin resolves them from the host's config
 * before the plugin adds anything (the sanitized config already holds the plugin's fields).
 */
export const resolveTestOptions = (
  _harness: TestPayload,
  overrides: Partial<FoldersPluginOptions> = {}
): ResolvedOptions =>
  normalizeOptions({ collections: { pages: true, posts: { label: "Blog post" } }, ...overrides }, {
    collections: [
      {
        slug: "pages",
        fields: [
          { name: "title", type: "text" },
          { localized: true, name: "slug", type: "text" },
        ],
      },
      {
        slug: "posts",
        fields: [
          { name: "title", type: "text" },
          { name: "slug", type: "text" },
        ],
      },
    ],
    localization: { defaultLocale: "en", fallback: true, locales: ["en", "de"] },
  } as unknown as Config);

/** A request for code that calls the plugin's core functions directly, outside a Payload operation. */
export const createTestRequest = (payload: Payload): Promise<PayloadRequest> =>
  createPayloadRequest({ payload, req: {} });

let sequence = 0;

export const uniqueName = (prefix: string): string => {
  sequence += 1;
  return `${prefix}-${sequence}`;
};

export const createFolder = (
  payload: Payload,
  data: { name?: string; parent?: number | null; slug?: string } = {}
) => {
  const slug = data.slug ?? uniqueName("folder");

  return payload.create({
    collection: "folders",
    data: { name: data.name ?? slug, parent: data.parent ?? null, slug },
    depth: 0,
    overrideAccess: true,
  });
};

export const createPage = (
  payload: Payload,
  data: { folder?: number | null; slug?: string; title?: string }
) => {
  const slug = data.slug ?? uniqueName("page");

  return payload.create({
    collection: "pages",
    data: { folder: data.folder ?? null, slug, title: data.title ?? slug },
    depth: 0,
    overrideAccess: true,
  });
};
