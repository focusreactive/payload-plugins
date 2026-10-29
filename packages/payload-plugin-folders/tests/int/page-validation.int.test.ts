import type { Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SEGMENT_ERROR_MESSAGE } from "../../src/core/slugify.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { createFolder, createTestRequest, uniqueName } from "../helpers/treeFixtures.js";

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
});

afterAll(async () => {
  await harness?.destroy();
});

type FieldError = { locale?: string; message: string; path: string };

const rawFieldErrors = (error: unknown): FieldError[] =>
  ((error as { data?: { errors?: FieldError[] } }).data?.errors ?? []) as FieldError[];

/** Message and path of every field error; the locale a rule failed in is read with `errorLocales`. */
const fieldErrors = (error: unknown): Array<{ message: string; path: string }> =>
  rawFieldErrors(error).map(({ message, path }) => ({ message, path }));

const errorLocales = (error: unknown): Array<string | undefined> =>
  rawFieldErrors(error).map(({ locale }) => locale);

const catchError = async (work: Promise<unknown>): Promise<Record<string, unknown>> => {
  try {
    await work;
  } catch (error) {
    return error as Record<string, unknown>;
  }
  throw new Error("expected the call to fail");
};

type PageData = {
  _status?: "draft" | "published";
  folder?: number | null;
  isFolderRoot?: boolean;
  slug?: string;
  title: string;
};

const createPublishedPage = (payload: Payload, data: PageData) =>
  payload.create({
    collection: "pages",
    data: { _status: "published", folder: null, ...data },
    depth: 0,
    overrideAccess: true,
  });

const createDraftPage = (payload: Payload, data: PageData) =>
  payload.create({
    collection: "pages",
    data: { folder: null, ...data },
    depth: 0,
    draft: true,
    overrideAccess: true,
  });

const createPost = (payload: Payload, data: PageData) =>
  payload.create({
    collection: "posts",
    data: { folder: null, ...data },
    depth: 0,
    overrideAccess: true,
  });

const publish = (payload: Payload, id: number, data: Record<string, unknown> = {}) =>
  payload.update({
    collection: "pages",
    data: { _status: "published", ...data },
    depth: 0,
    id,
    overrideAccess: true,
  });

describe("page uniqueness", () => {
  it("same slug in two folders is allowed", async () => {
    const { payload } = harness;
    const first = await createFolder(payload, { name: "Two folders A" });
    const second = await createFolder(payload, { name: "Two folders B" });

    const inFirst = await createPublishedPage(payload, {
      folder: first.id,
      slug: "same",
      title: "Same A",
    });
    const inSecond = await createPublishedPage(payload, {
      folder: second.id,
      slug: "same",
      title: "Same B",
    });

    expect(inFirst.pathSegment).toBe("same");
    expect(inSecond.pathSegment).toBe("same");
    expect(inSecond.fullPath).toBe(`${second.fullPath}/same`);
  });

  it("same slug in one folder across pages and posts is refused", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Shared folder" });
    await createPublishedPage(payload, { folder: folder.id, slug: "shared", title: "Shared page" });

    const refusedPost = await catchError(
      createPost(payload, { folder: folder.id, slug: "shared", title: "Shared post" })
    );

    expect(refusedPost.status).toBe(400);
    expect(fieldErrors(refusedPost)).toEqual([
      {
        message: `${folder.fullPath}/shared is already used by Shared page (published)`,
        path: "slug",
      },
    ]);

    // The same the other way round, and for the first page type against itself.
    await createPost(payload, { folder: folder.id, slug: "only-post", title: "Only post" });
    const refusedPage = await catchError(
      createPublishedPage(payload, { folder: folder.id, slug: "only-post", title: "Late page" })
    );
    expect(fieldErrors(refusedPage)[0]).toMatchObject({
      message: `${folder.fullPath}/only-post is already used by Only post (published)`,
      path: "slug",
    });
    const refusedPage2 = await catchError(
      createPublishedPage(payload, { folder: folder.id, slug: "shared", title: "Page twin" })
    );
    expect(fieldErrors(refusedPage2)[0]?.path).toBe("slug");
  });

  it("a page segment equal to a sibling folder is refused", async () => {
    const { payload } = harness;
    const parent = await createFolder(payload, { name: "Has children" });
    const child = await createFolder(payload, {
      name: "Contact",
      parent: parent.id,
      slug: "contact",
    });

    const error = await catchError(
      createPublishedPage(payload, { folder: parent.id, slug: "contact", title: "Contact page" })
    );

    expect(error.status).toBe(400);
    expect(fieldErrors(error)).toEqual([
      { message: `${child.fullPath} is already used by a folder`, path: "slug" },
    ]);
  });

  it("a second root page is refused with the root-page message", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Company", slug: uniqueName("company") });
    await createPublishedPage(payload, {
      folder: folder.id,
      isFolderRoot: true,
      slug: "about",
      title: "About Us",
    });

    const error = await catchError(
      createPost(payload, {
        folder: folder.id,
        isFolderRoot: true,
        slug: "about-post",
        title: "Team",
      })
    );

    expect(error.status).toBe(400);
    expect(fieldErrors(error)).toEqual([
      {
        message: `About Us is already the root page of ${folder.fullPath}. Unset it first.`,
        path: "isFolderRoot",
      },
    ]);
  });

  it("the site root page is unique too", async () => {
    const { payload } = harness;
    await createPublishedPage(payload, { isFolderRoot: true, slug: "home", title: "Home" });

    const error = await catchError(
      createPublishedPage(payload, { isFolderRoot: true, slug: "start", title: "Start" })
    );

    expect(fieldErrors(error)).toEqual([
      { message: "Home is already the root page of /. Unset it first.", path: "isFolderRoot" },
    ]);
  });

  it("two drafts with one slug both save, publishing the second is refused", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Twins" });

    const first = await createDraftPage(payload, {
      folder: folder.id,
      slug: "twin",
      title: "Twin one",
    });
    const second = await createDraftPage(payload, {
      folder: folder.id,
      slug: "twin",
      title: "Twin two",
    });
    expect(first.pathSegment).toBe("twin");
    expect(second.pathSegment).toBe("twin");

    // The draft that was never published does not hold the URL, so the first publish passes.
    await publish(payload, first.id);
    const error = await catchError(publish(payload, second.id));

    expect(error.status).toBe(400);
    expect(fieldErrors(error)).toEqual([
      { message: `${folder.fullPath}/twin is already used by Twin one (published)`, path: "slug" },
    ]);
    const stillDraft = await payload.findByID({
      collection: "pages",
      depth: 0,
      draft: true,
      id: second.id,
      overrideAccess: true,
    });
    expect(stillDraft._status).toBe("draft");
  });

  it("two draft roots both save, publishing the second is refused", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Draft roots", slug: uniqueName("roots") });

    const first = await createDraftPage(payload, {
      folder: folder.id,
      isFolderRoot: true,
      slug: "root-one",
      title: "Root one",
    });
    const second = await createDraftPage(payload, {
      folder: folder.id,
      isFolderRoot: true,
      slug: "root-two",
      title: "Root two",
    });
    expect(first.isFolderRoot).toBe(true);
    expect(second.isFolderRoot).toBe(true);

    await publish(payload, first.id);
    const error = await catchError(publish(payload, second.id));

    expect(fieldErrors(error)).toEqual([
      {
        message: `Root one is already the root page of ${folder.fullPath}. Unset it first.`,
        path: "isFolderRoot",
      },
    ]);
  });

  it("a default-locale slug colliding in a fallback locale is refused", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Fallback folder" });
    // The press page owns /news in de through its own slug.
    const press = await createPublishedPage(payload, {
      folder: folder.id,
      slug: "press",
      title: "Press",
    });
    await payload.update({
      collection: "pages",
      data: { _status: "published", slug: "news", title: "Presse" },
      id: press.id,
      locale: "de",
      overrideAccess: true,
    });

    // The new page has no de slug, so in de it falls back to its en slug "news".
    const error = await catchError(
      createPublishedPage(payload, { folder: folder.id, slug: "news", title: "Latest" })
    );

    expect(error.status).toBe(400);
    expect(fieldErrors(error)).toEqual([
      { message: `${folder.fullPath}/news is already used by Presse (published)`, path: "slug" },
    ]);
    // en is free: the clash exists only in the fallback locale.
    expect(errorLocales(error)).toEqual(["de"]);

    // A slug that is free in en and in de is fine.
    await createPublishedPage(payload, { folder: folder.id, slug: "latest", title: "Latest" });
  });

  it("a de slug colliding with another page's fallback segment is refused", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Fallback reverse" });
    await createPublishedPage(payload, { folder: folder.id, slug: "wire", title: "Wire" });
    const agency = await createPublishedPage(payload, {
      folder: folder.id,
      slug: "agency",
      title: "Agency",
    });

    const error = await catchError(
      payload.update({
        collection: "pages",
        data: { _status: "published", slug: "wire", title: "Agentur" },
        id: agency.id,
        locale: "de",
        overrideAccess: true,
      })
    );

    expect(fieldErrors(error)).toEqual([
      { message: `${folder.fullPath}/wire is already used by Wire (published)`, path: "slug" },
    ]);
    expect(errorLocales(error)).toEqual(["de"]);
  });

  it("un-rooting with a taken segment is a field error", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Unroot", slug: uniqueName("unroot") });
    const root = await createPublishedPage(payload, {
      folder: folder.id,
      isFolderRoot: true,
      slug: "taken",
      title: "Former root",
    });
    await createPublishedPage(payload, { folder: folder.id, slug: "taken", title: "Squatter" });

    const error = await catchError(publish(payload, root.id, { isFolderRoot: false }));

    expect(error.status).toBe(400);
    expect(fieldErrors(error)).toEqual([
      { message: `${folder.fullPath}/taken is already used by Squatter (published)`, path: "slug" },
    ]);

    // With a free segment the same un-root succeeds.
    const unrooted = await publish(payload, root.id, { isFolderRoot: false, slug: "free-now" });
    expect(unrooted).toMatchObject({ isFolderRoot: false, pathSegment: "free-now" });
  });

  it("un-rooting with an invalid segment is a field error", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Unroot invalid" });
    // A root page's segment is not part of its URL, so the format is not checked while it is root.
    const root = await createPublishedPage(payload, {
      folder: folder.id,
      isFolderRoot: true,
      slug: "Not Valid!",
      title: "Odd root",
    });

    const error = await catchError(publish(payload, root.id, { isFolderRoot: false }));

    expect(fieldErrors(error)).toEqual([{ message: SEGMENT_ERROR_MESSAGE, path: "slug" }]);
  });

  it("a root-level page named admin is refused", async () => {
    const { payload } = harness;

    const page = await catchError(
      createPublishedPage(payload, { slug: "admin", title: "Admin page" })
    );
    const post = await catchError(createPost(payload, { slug: "api", title: "Api post" }));

    expect(page.status).toBe(400);
    expect(fieldErrors(page)).toEqual([
      { message: "/admin is used by the site itself", path: "slug" },
    ]);
    expect(fieldErrors(post)).toEqual([
      { message: "/api is used by the site itself", path: "slug" },
    ]);
    // The same segment one level down is not reserved.
    const folder = await createFolder(payload, { name: "Inside" });
    const inside = await createPublishedPage(payload, {
      folder: folder.id,
      slug: "admin",
      title: "Inner admin",
    });
    expect(inside.pathSegment).toBe("admin");
  });
});

describe("page segment rules", () => {
  it("derives an empty slug from the title", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Derive" });

    const post = await createPost(payload, { folder: folder.id, title: "Hello World & Co" });
    const page = await createPublishedPage(payload, { folder: folder.id, title: "Grüße aus Köln" });

    expect(post.slug).toBe("hello-world-co");
    expect(post.pathSegment).toBe("hello-world-co");
    expect(page.slug).toBe("gruesse-aus-koeln");
  });

  it("refuses an invalid segment, drafts included, and never rewrites it", async () => {
    const { payload } = harness;

    const published = await catchError(
      createPublishedPage(payload, { slug: "Summer Sale", title: "Summer" })
    );
    const draft = await catchError(
      createDraftPage(payload, { slug: "summer_sale!", title: "Summer" })
    );

    for (const error of [published, draft]) {
      expect(error.status).toBe(400);
      expect(fieldErrors(error)).toEqual([{ message: SEGMENT_ERROR_MESSAGE, path: "slug" }]);
    }
  });

  it("refuses a published page that has no segment at all", async () => {
    const { payload } = harness;

    const error = await catchError(createPublishedPage(payload, { slug: "", title: "!!!" }));

    expect(fieldErrors(error)).toEqual([
      {
        message: "A page needs a slug in the default locale (en); save it in en first",
        path: "slug",
      },
    ]);
  });

  it("a legacy conflict is accepted until the segment is edited", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Legacy" });
    await createPublishedPage(payload, { folder: folder.id, slug: "legacy-a", title: "Legacy A" });
    // A conflict saved before the plugin was installed: an internal write skips the validation.
    const second = await payload.create({
      collection: "pages",
      context: { foldersInternal: true },
      data: { _status: "published", folder: folder.id, slug: "legacy-a", title: "Legacy B" },
      depth: 0,
      overrideAccess: true,
    });

    const renamed = await publish(payload, second.id, { title: "Legacy B renamed" });
    expect(renamed.title).toBe("Legacy B renamed");

    await createPublishedPage(payload, { folder: folder.id, slug: "legacy-c", title: "Legacy C" });
    const edited = await catchError(publish(payload, second.id, { slug: "legacy-c" }));
    expect(fieldErrors(edited)[0]?.path).toBe("slug");
  });

  it("a create in a folder that does not allow the type returns 400", async () => {
    const { config, payload } = harness;
    const folder = await createFolder(payload, { name: "Posts only" });
    await payload.update({
      collection: "folders",
      data: { allowedTypes: ["posts"] },
      id: folder.id,
      overrideAccess: true,
    });

    const refused = await callEndpoint<{ errors: Array<{ data?: { errors?: FieldError[] } }> }>({
      body: { _status: "published", folder: folder.id, slug: "not-here", title: "Not here" },
      config,
      method: "POST",
      path: "/pages",
      payload,
    });
    const allowed = await callEndpoint({
      body: { folder: folder.id, slug: "welcome", title: "Welcome" },
      config,
      method: "POST",
      path: "/posts",
      payload,
    });

    expect(refused.status).toBe(400);
    expect(refused.body.errors[0].data?.errors).toEqual([
      { message: 'This folder does not accept the type "Page"', path: "folder" },
    ]);
    expect(allowed.status).toBe(201);
  });

  it("refuses a create beyond the depth cap and allows the root page of the deepest folder", async () => {
    const { payload } = harness;
    const deep = await createFolder(payload, { name: "Deep" });
    await payload.db.updateOne({
      collection: "folders",
      data: { depth: 20 },
      id: deep.id,
      returning: false,
    });

    const error = await catchError(
      createDraftPage(payload, { folder: deep.id, slug: "too-deep", title: "Too deep" })
    );
    const root = await createDraftPage(payload, {
      folder: deep.id,
      isFolderRoot: true,
      slug: "deep-root",
      title: "Deep root",
    });

    expect(fieldErrors(error)).toEqual([
      { message: "This would make URLs 21 segments deep; the limit is 20", path: "folder" },
    ]);
    expect(root.isFolderRoot).toBe(true);
  });

  it("a shared req still validates after an earlier save on it", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Shared req" });
    await createPublishedPage(payload, { folder: folder.id, slug: "taken-on-req", title: "Taken" });
    const request = await createTestRequest(payload);
    const localeBefore = request.locale;

    await payload.create({
      collection: "pages",
      data: { _status: "published", folder: folder.id, slug: "first-on-req", title: "First" },
      depth: 0,
      overrideAccess: true,
      req: request,
    });
    expect(request.locale).toBe(localeBefore);

    const error = await catchError(
      payload.create({
        collection: "pages",
        data: { _status: "published", folder: folder.id, slug: "taken-on-req", title: "Second" },
        depth: 0,
        overrideAccess: true,
        req: request,
      })
    );
    expect(error.status).toBe(400);
    expect(Object.keys(request.context).filter((key) => !key.startsWith("_"))).toEqual([]);
  });

  it("two parallel publishes of one slug leave exactly one page", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Race" });

    const results = await Promise.allSettled(
      ["Racer one", "Racer two", "Racer three"].map((title) =>
        createPublishedPage(payload, { folder: folder.id, slug: "race", title })
      )
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter((result) => result.status === "rejected");
    expect(rejected).toHaveLength(2);
    for (const result of rejected) {
      expect(fieldErrors((result as PromiseRejectedResult).reason)[0]?.path).toBe("slug");
    }
    const { totalDocs } = await payload.count({
      collection: "pages",
      overrideAccess: true,
      where: { folder: { equals: folder.id } },
    });
    expect(totalDocs).toBe(1);
  });
});
