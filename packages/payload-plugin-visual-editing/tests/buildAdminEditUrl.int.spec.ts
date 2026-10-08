import { describe, expect, it } from "vitest";

import { defaultBuildAdminEditUrl } from "../src/client/buildAdminEditUrl";

describe("defaultBuildAdminEditUrl", () => {
  it("builds collection URL with veFocus query param", () => {
    const url = defaultBuildAdminEditUrl({
      docId: "abc",
      collectionSlug: "pages",
      kind: "collection",
      path: "hero.0.richText",
    });
    expect(url).toBe("/admin/collections/pages/abc?veFocus=hero.0.richText");
  });

  it("builds global URL without docId", () => {
    const url = defaultBuildAdminEditUrl({
      docId: undefined,
      collectionSlug: "siteSettings",
      kind: "global",
      path: "defaultFaqSet",
    });
    expect(url).toBe("/admin/globals/siteSettings?veFocus=defaultFaqSet");
  });

  it("appends locale when provided", () => {
    const url = defaultBuildAdminEditUrl({
      docId: "abc",
      collectionSlug: "pages",
      kind: "collection",
      path: "title",
      locale: "en",
    });
    expect(url).toBe("/admin/collections/pages/abc?veFocus=title&locale=en");
  });

  it("URL-encodes the path", () => {
    const url = defaultBuildAdminEditUrl({
      docId: "abc",
      collectionSlug: "pages",
      kind: "collection",
      path: "a/b c",
    });
    expect(url).toContain("veFocus=a%2Fb%20c");
  });
});

describe("defaultBuildAdminEditUrl — empty path", () => {
  it("omits veFocus when path is empty", () => {
    const url = defaultBuildAdminEditUrl({
      path: "",
      collectionSlug: "media",
      kind: "collection",
      docId: "m-1",
    });
    expect(url).toBe("/admin/collections/media/m-1");
  });

  it("includes only locale when path is empty but locale is set", () => {
    const url = defaultBuildAdminEditUrl({
      path: "",
      collectionSlug: "media",
      kind: "collection",
      docId: "m-1",
      locale: "fr",
    });
    expect(url).toBe("/admin/collections/media/m-1?locale=fr");
  });
});
