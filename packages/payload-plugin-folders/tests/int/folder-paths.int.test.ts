import type { Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { createFolder, createPage } from "../helpers/treeFixtures.js";

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
});

afterAll(async () => {
  await harness?.destroy();
});

type FolderAllLocales = {
  ancestorIds: string | null;
  depth: number | null;
  fullPath: Record<string, string>;
  id: number;
  name: Record<string, string>;
  slug: Record<string, string>;
};

const readAllLocales = async (payload: Payload, id: number): Promise<FolderAllLocales> =>
  (await payload.findByID({
    collection: "folders",
    depth: 0,
    id,
    locale: "all",
    overrideAccess: true,
  })) as unknown as FolderAllLocales;

const fieldErrors = (error: unknown): Array<{ message: string; path: string }> =>
  ((error as { data?: { errors?: Array<{ message: string; path: string }> } }).data?.errors ??
    []) as Array<{ message: string; path: string }>;

const catchError = async (work: Promise<unknown>): Promise<Record<string, unknown>> => {
  try {
    await work;
  } catch (error) {
    return error as Record<string, unknown>;
  }
  throw new Error("expected the call to fail");
};

describe("folder paths", () => {
  it("nested create gives /products/shoes/running", async () => {
    const { payload } = harness;
    const products = await createFolder(payload, { name: "Products", slug: "products" });
    const shoes = await createFolder(payload, {
      name: "Shoes",
      parent: products.id,
      slug: "shoes",
    });
    const running = await createFolder(payload, {
      name: "Running",
      parent: shoes.id,
      slug: "running",
    });

    expect(products).toMatchObject({
      ancestorIds: "/",
      depth: 1,
      fullPath: "/products",
      parent: null,
    });
    expect(shoes).toMatchObject({
      ancestorIds: `/${products.id}/`,
      depth: 2,
      fullPath: "/products/shoes",
    });
    expect(running).toMatchObject({
      ancestorIds: `/${products.id}/${shoes.id}/`,
      depth: 3,
      fullPath: "/products/shoes/running",
      parent: shoes.id,
    });
    const stored = await readAllLocales(payload, running.id);
    // Every locale carries a complete path, also the one without a name of its own.
    expect(stored.fullPath).toEqual({
      de: "/products/shoes/running",
      en: "/products/shoes/running",
    });
  });

  it("de slug aktuelles gives /aktuelles in de and /blog in en", async () => {
    const { payload } = harness;
    const blog = await createFolder(payload, { name: "Blog", slug: "blog" });
    await payload.update({
      collection: "folders",
      data: { name: "Aktuelles", slug: "aktuelles" },
      id: blog.id,
      locale: "de",
      overrideAccess: true,
    });

    const stored = await readAllLocales(payload, blog.id);
    expect(stored.fullPath).toEqual({ de: "/aktuelles", en: "/blog" });
    expect(stored.slug).toEqual({ de: "aktuelles", en: "blog" });

    // A child made now composes the translated parent into its own de path.
    const team = await createFolder(payload, { name: "Team", parent: blog.id, slug: "team" });
    expect((await readAllLocales(payload, team.id)).fullPath).toEqual({
      de: "/aktuelles/team",
      en: "/blog/team",
    });
  });

  it("en values survive a de rename", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Company", slug: "company" });
    await payload.update({
      collection: "folders",
      data: { name: "Firma", slug: "firma" },
      id: folder.id,
      locale: "de",
      overrideAccess: true,
    });

    await payload.update({
      collection: "folders",
      data: { name: "Unternehmen" },
      id: folder.id,
      locale: "de",
      overrideAccess: true,
    });

    const stored = await readAllLocales(payload, folder.id);
    expect(stored.name).toEqual({ de: "Unternehmen", en: "Company" });
    expect(stored.slug).toEqual({ de: "firma", en: "company" });
    expect(stored.fullPath).toEqual({ de: "/firma", en: "/company" });
  });

  it("a default-locale slug change moves the paths of locales that fall back to it", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Press", slug: "press" });
    const own = await createFolder(payload, { name: "Media", slug: "media" });
    await payload.update({
      collection: "folders",
      data: { name: "Medien", slug: "medien" },
      id: own.id,
      locale: "de",
      overrideAccess: true,
    });

    await payload.update({
      collection: "folders",
      data: { slug: "newsroom" },
      id: folder.id,
      overrideAccess: true,
    });
    await payload.update({
      collection: "folders",
      data: { slug: "gallery" },
      id: own.id,
      overrideAccess: true,
    });

    expect((await readAllLocales(payload, folder.id)).fullPath).toEqual({
      de: "/newsroom",
      en: "/newsroom",
    });
    // A locale with its own slug keeps it.
    expect((await readAllLocales(payload, own.id)).fullPath).toEqual({
      de: "/medien",
      en: "/gallery",
    });
  });

  it("refuses /api at the root", async () => {
    const { payload } = harness;
    const error = await catchError(createFolder(payload, { name: "Api", slug: "api" }));

    expect(error.status).toBe(400);
    expect(fieldErrors(error)).toEqual([
      expect.objectContaining({ message: "/api is used by the site itself", path: "slug" }),
    ]);
    // Below the root the same segment is fine.
    const parent = await createFolder(payload);
    await expect(
      createFolder(payload, { name: "Api", parent: parent.id, slug: "api" })
    ).resolves.toBeDefined();
  });

  it("refuses a segment that is not a valid slug", async () => {
    const { payload } = harness;

    const upper = await catchError(createFolder(payload, { name: "Bad", slug: "Not Valid" }));
    expect(fieldErrors(upper)[0]?.message).toMatch(/lowercase letters, numbers/u);
    const dotted = await catchError(createFolder(payload, { name: "Bad", slug: "robots.txt" }));
    expect(fieldErrors(dotted)[0]?.path).toBe("slug");
    const parent = await createFolder(payload);
    await expect(
      createFolder(payload, { name: "Dotted", parent: parent.id, slug: "index.html" })
    ).resolves.toBeDefined();
  });

  it("refuses a twenty-first level", async () => {
    const { payload } = harness;
    let parent: number | null = null;
    for (let level = 1; level <= 20; level += 1) {
      const folder: Awaited<ReturnType<typeof createFolder>> = await createFolder(payload, {
        parent,
        slug: `level-${level}`,
      });
      parent = folder.id;
    }

    const error = await catchError(createFolder(payload, { parent, slug: "level-21" }));

    expect(error.status).toBe(400);
    expect(fieldErrors(error)).toEqual([
      expect.objectContaining({
        message: "This would make URLs 21 segments deep; the limit is 20",
        path: "parent",
      }),
    ]);
  });

  it("refuses a duplicate sibling slug per locale including fallback locales", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { name: "News", slug: "news" });

    // Same locale, same parent.
    const sameLocale = await catchError(createFolder(payload, { name: "News too", slug: "news" }));
    expect(fieldErrors(sameLocale)[0]).toMatchObject({
      message: "/news is already used by another folder",
      path: "slug",
    });

    // The news folder has no German slug, so it answers /news in de. A German slug of "news" on a
    // different folder would take the same de path.
    const press = await createFolder(payload, { name: "Press", slug: "press" });
    const fallbackClash = await catchError(
      payload.update({
        collection: "folders",
        data: { name: "News", slug: "news" },
        id: press.id,
        locale: "de",
        overrideAccess: true,
      })
    );
    expect(fieldErrors(fallbackClash)[0]).toMatchObject({
      message: "/news is already used by another folder",
      path: "slug",
    });
    // Nothing of the refused write stayed.
    const pressAfter = await readAllLocales(payload, press.id);
    expect(pressAfter.slug.en).toBe("press");
    expect(pressAfter.slug.de).toBeFalsy();
    expect((await readAllLocales(payload, news.id)).fullPath).toEqual({ de: "/news", en: "/news" });

    // Different parents do not clash.
    const parent = await createFolder(payload);
    await expect(
      createFolder(payload, { name: "News", parent: parent.id, slug: "news" })
    ).resolves.toBeDefined();
  });

  it("refuses a folder segment that a page in the same folder already uses", async () => {
    const { payload } = harness;
    const parent = await createFolder(payload);
    await createPage(payload, { folder: parent.id, slug: "contact" });

    const error = await catchError(
      createFolder(payload, { name: "Contact", parent: parent.id, slug: "contact" })
    );

    expect(fieldErrors(error)[0]).toMatchObject({
      message: `/${parent.slug}/contact is already used by a page`,
      path: "slug",
    });
  });

  it("refuses a parent change through a normal update", async () => {
    const { payload } = harness;
    const first = await createFolder(payload);
    const second = await createFolder(payload);
    const child = await createFolder(payload, { parent: first.id });

    const error = await catchError(
      payload.update({
        collection: "folders",
        data: { parent: second.id },
        id: child.id,
        overrideAccess: true,
      })
    );

    expect(error.status).toBe(400);
    expect(error.message).toBe("Use moveItems() to move content");
    const toRoot = await catchError(
      payload.update({
        collection: "folders",
        data: { parent: null },
        id: child.id,
        overrideAccess: true,
      })
    );
    expect(toRoot.status).toBe(400);
    const intoOwnChild = await catchError(
      payload.update({
        collection: "folders",
        data: { parent: child.id },
        id: first.id,
        overrideAccess: true,
      })
    );
    expect(intoOwnChild.status).toBe(400);
    // Saving the parent it already has is not a change.
    await expect(
      payload.update({
        collection: "folders",
        data: { name: "Renamed", parent: first.id },
        depth: 0,
        id: child.id,
        overrideAccess: true,
      })
    ).resolves.toMatchObject({ parent: first.id });
  });

  it("an empty slug is derived from the name", async () => {
    const { payload } = harness;
    const created = await payload.create({
      collection: "folders",
      data: { name: "Über Uns & Co" },
      overrideAccess: true,
    });
    expect(created).toMatchObject({ fullPath: "/ueber-uns-co", slug: "ueber-uns-co" });

    const explicitlyEmpty = await payload.create({
      collection: "folders",
      data: { name: "Our Team", slug: "" },
      overrideAccess: true,
    });
    expect(explicitlyEmpty.slug).toBe("our-team");

    // A submitted slug is never rewritten: it is refused instead.
    const error = await catchError(
      payload.create({
        collection: "folders",
        data: { name: "Whatever", slug: "Über Uns" },
        overrideAccess: true,
      })
    );
    expect(error.status).toBe(400);
  });
});

describe("folder writes under the tree lock", () => {
  it("parallel creates of one slug let exactly one through", async () => {
    const { payload } = harness;
    const parent = await createFolder(payload);

    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        createFolder(payload, { name: "Same", parent: parent.id, slug: "same" })
      )
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    for (const result of results.filter((entry) => entry.status === "rejected")) {
      expect((result as PromiseRejectedResult).reason).toMatchObject({ status: 400 });
    }
  });

  it("parallel creates and renames in one parent keep paths and keys distinct", async () => {
    const { payload } = harness;
    const parent = await createFolder(payload);
    const existing = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        createFolder(payload, { parent: parent.id, slug: `old-${index}` })
      )
    );

    const settled = await Promise.all([
      ...Array.from({ length: 8 }, (_, index) =>
        createFolder(payload, { parent: parent.id, slug: `new-${index}` })
      ),
      ...existing.map((folder, index) =>
        payload.update({
          collection: "folders",
          data: { slug: `renamed-${index}` },
          depth: 0,
          id: folder.id,
          overrideAccess: true,
        })
      ),
    ]);

    expect(new Set(settled.map((folder) => folder.fullPath)).size).toBe(12);
    const keys = settled
      .filter((folder) => folder.id > existing[3].id)
      .map((folder) => folder.orderKey);
    expect(new Set(keys).size).toBe(8);
  });
});

describe("folder parent values", () => {
  it("a parent of 0 is a 400 field error, not a 500", async () => {
    const { config, payload } = harness;

    const { body, status } = await callEndpoint<{
      errors: Array<{ data: { errors: Array<{ message: string; path: string }> } }>;
    }>({
      body: { name: "Zero parent", parent: 0, slug: "zero-parent" },
      config,
      method: "POST",
      path: "/folders",
      payload,
    });

    expect(status).toBe(400);
    expect(body.errors[0].data.errors).toEqual([expect.objectContaining({ path: "parent" })]);
  });

  it("a parent that does not exist is a 400 field error, not a 500", async () => {
    const { config, payload } = harness;

    const { body, status } = await callEndpoint<{
      errors: Array<{ data: { errors: Array<{ message: string; path: string }> } }>;
    }>({
      body: { name: "Orphan", parent: 987_654, slug: "orphan" },
      config,
      method: "POST",
      path: "/folders",
      payload,
    });

    expect(status).toBe(400);
    expect(body.errors[0].data.errors).toEqual([
      expect.objectContaining({ message: "The parent folder does not exist", path: "parent" }),
    ]);
    const page = await callEndpoint({
      body: { folder: 987_654, slug: "orphan-page", title: "Orphan page" },
      config,
      method: "POST",
      path: "/pages",
      payload,
    });
    expect(page.status).toBe(400);
  });

  it("a null parent stays at the root", async () => {
    const folder = await createFolder(harness.payload, { parent: null });

    expect(folder.parent).toBeNull();
    expect(folder.fullPath).toBe(`/${folder.slug}`);
  });
});
