import type { Payload } from "payload";
import { describe, expect, it } from "vitest";

import { countMirrorRows, planMirrorRows } from "../../src/core/mirror.js";
import type { PathChange, ResolvedOptions } from "../../src/types.js";

const payload = { config: { localization: { defaultLocale: "en" } } } as unknown as Payload;

const buildOptions = (
  localePrefix: ResolvedOptions["urls"]["localePrefix"] = "non-default",
  isMirrorOn = true,
  trailingSlash = false
): ResolvedOptions =>
  ({
    redirects: {
      enabled: true,
      mirror: isMirrorOn
        ? { collectionSlug: "redirects", redirectType: null, referenceCollections: ["pages"] }
        : null,
      mirrorToRedirectsPlugin: isMirrorOn,
    },
    urls: { localePrefix, trailingSlash },
  }) as unknown as ResolvedOptions;

const pageChange = (overrides: Partial<PathChange> = {}): PathChange => ({
  collection: "pages",
  from: "/blog/post",
  id: 1,
  kind: "page",
  locale: "en",
  published: true,
  to: "/news/post",
  ...overrides,
});

describe("planMirrorRows", () => {
  it("prefixes the old and the new path of a non-default locale", () => {
    const rows = planMirrorRows(
      [pageChange({ locale: "de", from: "/blog/post", to: "/news/post" })],
      buildOptions(),
      payload
    );

    expect(rows).toEqual([
      {
        collection: "pages",
        from: "/de/blog/post",
        id: 1,
        locale: "de",
        path: "/blog/post",
        to: "/de/news/post",
      },
    ]);
  });

  it("follows the locale prefix mode of the frontend", () => {
    const change = pageChange({ locale: "en" });

    expect(planMirrorRows([change], buildOptions("all"), payload)[0].from).toBe("/en/blog/post");
    expect(planMirrorRows([change], buildOptions("none"), payload)[0].from).toBe("/blog/post");
    expect(
      planMirrorRows(
        [pageChange({ from: "/", locale: "de", to: "/home" })],
        buildOptions(),
        payload
      )[0].from
    ).toBe("/de");
  });

  it("writes both paths in the urls.trailingSlash form, the locale root included", () => {
    const options = buildOptions("non-default", true, true);

    expect(
      planMirrorRows([pageChange({ locale: "de", from: "/old", to: "/new" })], options, payload)[0]
    ).toMatchObject({ from: "/de/old/", path: "/old", to: "/de/new/" });
    expect(
      planMirrorRows([pageChange({ from: "/", locale: "de", to: "/home" })], options, payload)[0]
        .from
    ).toBe("/de/");
    expect(
      planMirrorRows([pageChange({ from: "/a/feed.xml", to: "/b" })], options, payload)[0].from
    ).toBe("/a/feed.xml");
  });

  it("keeps the capitals of a legacy path, which visitors reached as written", () => {
    const rows = planMirrorRows(
      [pageChange({ from: "/About", to: "/about" })],
      buildOptions(),
      payload
    );

    expect(rows[0].from).toBe("/About");
  });

  it("skips creates, deletes, unchanged paths, drafts and folders", () => {
    const rows = planMirrorRows(
      [
        pageChange({ from: null }),
        pageChange({ to: null }),
        pageChange({ from: "/same", to: "/same" }),
        pageChange({ published: false }),
        pageChange({ collection: "folders", kind: "folder" }),
      ],
      buildOptions(),
      payload
    );

    expect(rows).toEqual([]);
  });

  it("keeps one row per from when the prefix mode makes two locales collide", () => {
    const rows = planMirrorRows(
      [pageChange({ locale: "en" }), pageChange({ locale: "de", to: "/de-only" })],
      buildOptions("none"),
      payload
    );

    expect(rows).toHaveLength(1);
  });
});

describe("countMirrorRows", () => {
  it("counts the rows that will be written and nothing when the mirror is off", () => {
    const changes = [pageChange(), pageChange({ id: 2, locale: "de" })];

    expect(countMirrorRows(changes, buildOptions(), payload)).toBe(2);
    expect(countMirrorRows(changes, buildOptions("non-default", false), payload)).toBe(0);
  });

  it("leaves out a row that starts at a path a page now holds", () => {
    const changes = [
      pageChange({ from: "/a", id: 1, to: "/b" }),
      pageChange({ from: "/b", id: 2, to: "/a" }),
    ];

    expect(countMirrorRows(changes, buildOptions(), payload)).toBe(0);
  });
});
