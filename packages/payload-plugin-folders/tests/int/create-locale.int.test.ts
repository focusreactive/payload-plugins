import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { localizeNewValues } from "../../src/admin/Create/localizedValues.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
});

afterAll(async () => {
  await harness?.destroy();
});

type Created = { doc: { id: number } };
type StoredFolder = {
  fullPath: Record<string, string>;
  name: Record<string, string | null>;
  slug: Record<string, string | null | undefined>;
};

const readFolderInEveryLocale = (id: number) =>
  harness.payload.findByID({
    collection: "folders",
    depth: 0,
    id,
    locale: "all" as never,
    overrideAccess: true,
  }) as unknown as Promise<StoredFolder>;

// The create dialogs build their request with `localizeNewValues` (spec section 8), so these tests
// send what the dialogs send and check what the server stores.
const dialogRequest = (
  current: string,
  localizedFields: string[],
  values: Record<string, unknown>
) =>
  localizeNewValues({
    locales: { current, default: "en" },
    localizedFields: new Set(localizedFields),
    values,
  });

describe("create in the admin's content locale", () => {
  it("a folder created while the admin shows de is written in de and in en", async () => {
    const { config, payload } = harness;
    const typed = dialogRequest("de", ["name", "slug"], { name: "Aktuelles", slug: "aktuelles" });

    const created = await callEndpoint<Created>({
      body: typed.body,
      config,
      method: "POST",
      path: `/folders?locale=${typed.locale}`,
      payload,
    });

    expect(created.status).toBe(201);
    const stored = await readFolderInEveryLocale(created.body.doc.id);
    expect(stored.name).toEqual({ de: "Aktuelles", en: "Aktuelles" });
    expect(stored.slug).toEqual({ de: "aktuelles", en: "aktuelles" });
    expect(stored.fullPath).toEqual({ de: "/aktuelles", en: "/aktuelles" });

    // The de text is the editor's own: translating the default locale later leaves it alone.
    await payload.update({
      collection: "folders",
      data: { name: "News", slug: "news" },
      id: created.body.doc.id,
      locale: "en",
      overrideAccess: true,
    });
    expect((await readFolderInEveryLocale(created.body.doc.id)).fullPath).toEqual({
      de: "/aktuelles",
      en: "/news",
    });
  });

  it("a folder created in de alone is refused, which is why the default locale is written too", async () => {
    const { config, payload } = harness;

    const refused = await callEndpoint<{ errors: Array<{ message: string }> }>({
      body: { name: "Nur Deutsch", slug: "nur-deutsch" },
      config,
      method: "POST",
      path: "/folders?locale=de",
      payload,
    });

    expect(refused.status).toBe(400);
    expect(JSON.stringify(refused.body)).toContain("in the default locale (en)");
  });

  it("a folder created while the admin shows the default locale is written there only", async () => {
    const { config, payload } = harness;
    const typed = dialogRequest("en", ["name", "slug"], { name: "Reports", slug: "reports" });

    const created = await callEndpoint<Created>({
      body: typed.body,
      config,
      method: "POST",
      path: `/folders?locale=${typed.locale}`,
      payload,
    });

    expect(created.status).toBe(201);
    const stored = await readFolderInEveryLocale(created.body.doc.id);
    // The folder's path write gives de a row, which holds the path only: the text stays en's.
    expect(stored.name).toEqual({ de: null, en: "Reports" });
    expect(stored.slug).toEqual({ de: null, en: "reports" });
    expect(stored.fullPath).toEqual({ de: "/reports", en: "/reports" });
  });

  it("a page created while the admin shows de is a draft in both locales that can be published in en", async () => {
    const { config, payload } = harness;
    const typed = dialogRequest("de", ["title", "slug"], { slug: "neuigkeit", title: "Neuigkeit" });

    const created = await callEndpoint<Created>({
      body: { ...typed.body, _status: "draft", folder: null, isFolderRoot: false },
      config,
      method: "POST",
      path: `/pages?draft=true&locale=${typed.locale}`,
      payload,
    });

    expect(created.status).toBe(201);
    const stored = (await payload.findByID({
      collection: "pages",
      depth: 0,
      draft: true,
      id: created.body.doc.id,
      locale: "all" as never,
      overrideAccess: true,
    })) as unknown as {
      pathSegment: Record<string, string>;
      slug: Record<string, string>;
      title: Record<string, string>;
    };
    expect(stored.title).toEqual({ de: "Neuigkeit", en: "Neuigkeit" });
    expect(stored.slug).toEqual({ de: "neuigkeit", en: "neuigkeit" });
    expect(stored.pathSegment).toEqual({ de: "neuigkeit", en: "neuigkeit" });

    // A page that only exists in de needs an en slug before it can go live; this one has it.
    const published = await callEndpoint<Created>({
      body: { _status: "published" },
      config,
      method: "PATCH",
      path: `/pages/${created.body.doc.id}?locale=en`,
      payload,
    });
    expect(published.status).toBe(200);
  });

  it("a page whose fields are not localized is sent as it is, in the locale all", async () => {
    const { config, payload } = harness;
    const typed = dialogRequest("de", [], { slug: "meldung", title: "Meldung" });

    const created = await callEndpoint<Created>({
      body: { ...typed.body, folder: null, isFolderRoot: false },
      config,
      method: "POST",
      path: `/posts?locale=${typed.locale}`,
      payload,
    });

    expect(created.status).toBe(201);
    const stored = (await payload.findByID({
      collection: "posts",
      depth: 0,
      id: created.body.doc.id,
      locale: "all" as never,
      overrideAccess: true,
    })) as unknown as { slug: string; title: string };
    expect(stored).toMatchObject({ slug: "meldung", title: "Meldung" });
  });
});
