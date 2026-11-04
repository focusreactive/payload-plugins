import { setTimeout as sleep } from "node:timers/promises";

import type { CollectionConfig, User } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { computeFullPath, resolvePath } from "../../src/server/index.js";
import type { ResolveArgs } from "../../src/server/index.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { runGraphql } from "../helpers/runGraphql.js";
import { createFolder, uniqueName } from "../helpers/treeFixtures.js";

// A collection that anyone may read, with drafts and localized fields: the public frontend case.
// The dev app's `pages` keep their default access (a signed-in user reads), which the access cases
// below use.
const articles: CollectionConfig = {
  slug: "articles",
  access: { read: () => true },
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "slug", type: "text", localized: true },
  ],
  versions: { drafts: true },
};

let harness: TestPayload;
let editor: User;

beforeAll(async () => {
  harness = await getTestPayload({
    extraCollections: [articles],
    foldersOptions: { collections: { articles: true, pages: true, posts: true } as never },
  });
  editor = (await harness.payload.create({
    collection: "users",
    data: { email: "resolve-editor@example.com", password: "test-password", role: "editor" },
    overrideAccess: true,
  })) as unknown as User;
});

afterAll(async () => {
  await harness?.destroy();
});

const resolve = (args: ResolveArgs) => resolvePath(harness.payload, args);

type ArticleData = {
  folder?: number | null;
  isFolderRoot?: boolean;
  slug: string;
  status?: "draft" | "published";
  title?: string;
};

const createArticle = (data: ArticleData, extra: Record<string, unknown> = {}) =>
  harness.payload.create({
    collection: "articles" as never,
    data: {
      _status: data.status ?? "published",
      folder: data.folder ?? null,
      isFolderRoot: data.isFolderRoot ?? false,
      slug: data.slug,
      title: data.title ?? data.slug,
    } as never,
    depth: 0,
    draft: data.status === "draft",
    overrideAccess: true,
    ...extra,
  }) as unknown as Promise<{ id: number }>;

const updateArticle = (
  id: number,
  data: Record<string, unknown>,
  options: { draft?: boolean; locale?: "de" | "en" } = {}
) =>
  harness.payload.update({
    collection: "articles" as never,
    data: data as never,
    depth: 0,
    draft: options.draft,
    id,
    locale: options.locale,
    overrideAccess: true,
  });

const createPage = (data: { folder?: number | null; slug: string; title?: string }) =>
  harness.payload.create({
    collection: "pages",
    data: {
      _status: "published",
      folder: data.folder ?? null,
      slug: data.slug,
      title: data.title ?? data.slug,
    },
    depth: 0,
    overrideAccess: true,
  });

const renameFolder = (id: number, slug: string) =>
  harness.payload.update({
    collection: "folders",
    data: { name: slug, slug },
    depth: 0,
    id,
    overrideAccess: true,
  });

const foldersResolveQuery = (path: string, locale = "en") =>
  `{ foldersResolve(path: "${path}", locale: "${locale}") { type collection id fullPath redirectTo alternates { locale path } } }`;

const titleOf = (result: Awaited<ReturnType<typeof resolvePath>>): string | undefined =>
  result.type === "page" ? (result.doc as { title: string }).title : undefined;

describe("resolvePath", () => {
  it("/blog, /blog/ and blog resolve to Blog Home", async () => {
    const blog = await createFolder(harness.payload, { name: "Blog", slug: "blog" });
    await createArticle({ folder: blog.id, isFolderRoot: true, slug: "home", title: "Blog Home" });
    await createArticle({ folder: blog.id, slug: "team", title: "Team" });

    for (const path of ["/blog", "/blog/", "blog"]) {
      const result = await resolve({ path });

      expect(result).toMatchObject({
        collection: "articles",
        fullPath: "/blog",
        locale: "en",
        type: "page",
      });
      expect(titleOf(result)).toBe("Blog Home");
    }
    // The other forms of a nested path land on the page too, and a page is not its folder's root.
    for (const path of ["/blog/team", "blog/team/"]) {
      const result = await resolve({ path });

      expect(titleOf(result)).toBe("Team");
    }
  });

  it("/Blog redirects to /blog", async () => {
    const result = await resolve({ path: "/Blog" });

    expect(result).toEqual({ status: 301, to: "/blog", type: "redirect" });
    expect(await resolve({ path: "/BLOG/Team" })).toEqual({
      status: 301,
      to: "/blog/team",
      type: "redirect",
    });
    // A path that differs in case from nothing is not a redirect to nothing.
    expect(await resolve({ path: "/Nothing-Here" })).toEqual({ type: "notFound" });
    // Percent-encoding is decoded before the lookup.
    expect(titleOf(await resolve({ path: "/%62log/team" }))).toBe("Team");
  });

  it("/empty is notFound", async () => {
    await createFolder(harness.payload, { name: "Empty", slug: "empty" });

    expect(await resolve({ path: "/empty" })).toEqual({ type: "notFound" });
    expect(await resolve({ path: "/empty/deeper" })).toEqual({ type: "notFound" });
    expect(await resolve({ path: "/%E0%A4%A" })).toEqual({ type: "notFound" });
  });

  it("/ is the site root page", async () => {
    await createArticle({ isFolderRoot: true, slug: "start", title: "Home" });

    for (const path of ["/", ""]) {
      const result = await resolve({ path });

      expect(result).toMatchObject({ collection: "articles", fullPath: "/", type: "page" });
      expect(titleOf(result)).toBe("Home");
    }
    expect(await resolve({ path: "//" })).toEqual({ status: 301, to: "/", type: "redirect" });
  });

  it("repeated slashes redirect to the collapsed path, a trailing or missing slash resolves in place in either setting (P-37)", async () => {
    const folder = await createFolder(harness.payload, {
      name: "Slashes",
      slug: uniqueName("slashes"),
    });
    await createArticle({ folder: folder.id, slug: "team", title: "Team" });
    const base = `/${folder.slug}`;

    for (const path of [
      `//${folder.slug}//team`,
      `${base}//team`,
      `${base}/team//`,
      `//${folder.slug}/team`,
    ]) {
      expect(await resolve({ path })).toEqual({
        status: 301,
        to: `${base}/team`,
        type: "redirect",
      });
    }
    // The redirect follows the same rules as the case redirect: it needs a page at the target.
    expect(await resolve({ path: `${base}//nothing` })).toEqual({ type: "notFound" });
    // A trailing slash and a missing leading slash stay in place (ticket P-31).
    expect(titleOf(await resolve({ path: `${base}/team/` }))).toBe("Team");
    expect(titleOf(await resolve({ path: `${folder.slug}/team` }))).toBe("Team");
    // The framework owns the slash redirect, so no answer of the plugin carries a trailing slash.
    for (const path of [`${base}/team/`, `${folder.slug}/team`, `//${folder.slug}//team/`]) {
      const answer = await resolve({ path });
      const emitted = answer.type === "page" ? answer.fullPath : "to" in answer ? answer.to : "";

      expect(emitted).not.toMatch(/.\/$/u);
    }
    // The collapsed path can also be the case redirect's: one hop to the canonical form.
    expect(await resolve({ path: `//${String(folder.slug).toUpperCase()}//Team` })).toEqual({
      status: 301,
      to: `${base}/team`,
      type: "redirect",
    });
  });

  it("a root page does not answer at its own slug", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Roots", slug: uniqueName("roots") });
    await createArticle({
      folder: folder.id,
      isFolderRoot: true,
      slug: "landing",
      title: "Landing",
    });

    // The root page answers at its folder's path and nowhere else.
    expect(titleOf(await resolve({ path: `/${folder.slug}` }))).toBe("Landing");
    expect(await resolve({ path: `/${folder.slug}/landing` })).toEqual({ type: "notFound" });
  });

  it("an old path returns a redirect", async () => {
    const { payload } = harness;
    const about = await createFolder(payload, { name: "About", slug: "about" });
    await createArticle({ folder: about.id, slug: "contact", title: "Contact" });
    await createArticle({ folder: about.id, slug: "careers", title: "Careers" });
    expect(titleOf(await resolve({ path: "/about/contact" }))).toBe("Contact");

    await renameFolder(about.id, "company");

    // The answer carries the target path and status, and never the row's target document.
    const redirect = await resolve({ path: "/about/contact" });
    expect(redirect).toStrictEqual({ status: 301, to: "/company/contact", type: "redirect" });
    expect(await resolve({ path: "/about/careers/" })).toStrictEqual({
      status: 301,
      to: "/company/careers",
      type: "redirect",
    });
    // The new path resolves to the page, and the redirect row does not shadow a live document.
    expect(titleOf(await resolve({ path: "/company/contact" }))).toBe("Contact");
  });

  it("a never-published page with public read is notFound", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Secret", slug: uniqueName("secret") });
    await createArticle({ folder: folder.id, slug: "plan", status: "draft", title: "Plan" });
    await createArticle({
      folder: folder.id,
      isFolderRoot: true,
      slug: "secret-home",
      status: "draft",
      title: "Secret Home",
    });

    // The collection is publicly readable, and the main row of a draft-only page holds its draft.
    expect(await resolve({ path: `/${folder.slug}/plan` })).toEqual({ type: "notFound" });
    expect(await resolve({ path: `/${folder.slug}` })).toEqual({ type: "notFound" });
    // Asking for drafts without being known changes nothing.
    expect(await resolve({ draft: true, path: `/${folder.slug}/plan` })).toEqual({
      type: "notFound",
    });
    expect(await resolve({ draft: true, path: `/${folder.slug}/plan`, user: null })).toEqual({
      type: "notFound",
    });
  });

  it("draft true finds a never-published page for a logged-in user", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Preview", slug: uniqueName("preview") });
    await createArticle({
      folder: folder.id,
      slug: "upcoming",
      status: "draft",
      title: "Upcoming",
    });
    const path = `/${folder.slug}/upcoming`;

    const result = await resolve({ draft: true, path, user: editor });

    expect(result).toMatchObject({ collection: "articles", fullPath: path, type: "page" });
    expect(titleOf(result)).toBe("Upcoming");
    // The same user reading published pages does not see it.
    expect(await resolve({ path, user: editor })).toEqual({ type: "notFound" });
    // Past access control, a draft read is for the caller that asked to skip it.
    expect(titleOf(await resolve({ draft: true, overrideAccess: true, path }))).toBe("Upcoming");
  });

  it("foldersResolve answers over GraphQL", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Graph", slug: uniqueName("graph") });
    const page = await createArticle({ folder: folder.id, slug: "post", title: "Post" });
    const answerOf = async (path: string, locale?: string) => {
      const outcome = await runGraphql(harness, null, foldersResolveQuery(path, locale));
      expect(outcome.invalid).toBeUndefined();
      expect(outcome.errors).toBeUndefined();

      return (outcome.data as { foldersResolve: Record<string, unknown> }).foldersResolve;
    };

    expect(await answerOf(`/${folder.slug}/post`)).toEqual({
      alternates: [
        { locale: "en", path: `/${folder.slug}/post` },
        { locale: "de", path: `/${folder.slug}/post` },
      ],
      collection: "articles",
      fullPath: `/${folder.slug}/post`,
      id: String(page.id),
      redirectTo: null,
      type: "page",
    });
    // A de lookup of a page with no de slug of its own needs the fallback, which no GraphQL
    // `where` can express.
    expect(await answerOf(`/${folder.slug}/post`, "de")).toMatchObject({
      fullPath: `/${folder.slug}/post`,
      type: "page",
    });
    expect(await answerOf(`/${String(folder.slug).toUpperCase()}/post`)).toEqual({
      alternates: [],
      collection: null,
      fullPath: null,
      id: null,
      redirectTo: `/${folder.slug}/post`,
      type: "redirect",
    });
    expect(await answerOf(`/${folder.slug}/missing`)).toMatchObject({
      redirectTo: null,
      type: "notFound",
    });
  });

  it("computeFullPath uses an unsaved slug", async () => {
    const { payload } = harness;
    const blog = await createFolder(payload, { name: "Compute", slug: uniqueName("compute") });
    const sub = await createFolder(payload, { name: "Sub", parent: blog.id, slug: "sub" });
    const saved = await createPage({ folder: sub.id, slug: "saved" });
    await payload.update({
      collection: "folders",
      data: { name: "Berechnen", slug: "berechnen" },
      id: blog.id,
      locale: "de",
      overrideAccess: true,
    });

    expect(
      await computeFullPath(payload, { folder: sub.id, isFolderRoot: false, slug: "unsaved" })
    ).toBe(`/${blog.slug}/sub/unsaved`);
    const stored = await payload.findByID({
      collection: "pages",
      depth: 0,
      id: saved.id,
      overrideAccess: true,
    });
    expect(stored.fullPath).toBe(`/${blog.slug}/sub/saved`);
    // The folder of the form, not the saved one; the locale of the folder's own slug; a root page
    // takes the folder's path; the top level takes none.
    expect(
      await computeFullPath(payload, {
        folder: { id: sub.id },
        isFolderRoot: false,
        locale: "de",
        slug: "unsaved",
      })
    ).toBe("/berechnen/sub/unsaved");
    expect(
      await computeFullPath(payload, { folder: sub.id, isFolderRoot: true, slug: "ignored" })
    ).toBe(`/${blog.slug}/sub`);
    expect(await computeFullPath(payload, { folder: null, isFolderRoot: false, slug: "top" })).toBe(
      "/top"
    );
    expect(await computeFullPath(payload, { folder: null, isFolderRoot: true, slug: "" })).toBe(
      "/"
    );
    // No slug yet: the path of the folder, for a preview of a new page.
    expect(await computeFullPath(payload, { folder: sub.id, isFolderRoot: false, slug: " " })).toBe(
      `/${blog.slug}/sub`
    );
    await expect(
      computeFullPath(payload, { folder: 999_999, isFolderRoot: false, slug: "x" })
    ).rejects.toThrow("does not exist");
  });
});

describe("resolvePath rules", () => {
  it("oldest wins when two pages share a path", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Twice", slug: uniqueName("twice") });
    const first = await createArticle({ folder: folder.id, slug: "same", title: "First" });
    // A conflict that predates the plugin: an internal write skips the uniqueness check.
    const second = await createArticle(
      { folder: folder.id, slug: "same", title: "Second" },
      { context: { foldersInternal: true } }
    );
    expect(second.id).not.toBe(first.id);

    const result = await resolve({ path: `/${folder.slug}/same` });

    expect(titleOf(result)).toBe("First");
  });

  it("oldest wins when two collections share a path, whichever collection holds it", async () => {
    const { payload } = harness;
    const createInternalPage = (folder: number, title: string) =>
      payload.create({
        collection: "pages",
        context: { foldersInternal: true },
        data: { _status: "published", folder, slug: "same", title },
        depth: 0,
        overrideAccess: true,
      });

    // The article is the oldest: the pages collection holds a later duplicate that predates no check.
    const articleFirst = await createFolder(payload, { name: "AF", slug: uniqueName("af") });
    await createArticle({ folder: articleFirst.id, slug: "same", title: "Article first" });
    await sleep(15);
    await createInternalPage(articleFirst.id, "Page second");
    // The page is the oldest: the article collection holds the later duplicate.
    const pageFirst = await createFolder(payload, { name: "PF", slug: uniqueName("pf") });
    await createPage({ folder: pageFirst.id, slug: "same", title: "Page first" });
    await sleep(15);
    await createArticle(
      { folder: pageFirst.id, slug: "same", title: "Article second" },
      { context: { foldersInternal: true } }
    );

    expect(
      titleOf(await resolve({ overrideAccess: true, path: `/${articleFirst.slug}/same` }))
    ).toBe("Article first");
    expect(titleOf(await resolve({ overrideAccess: true, path: `/${pageFirst.slug}/same` }))).toBe(
      "Page first"
    );
  });

  it("a legacy segment answers in place only under a lowercase folder path", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Cased", slug: uniqueName("cased") });
    // Saved before the plugin: an internal write skips the segment pattern (decision 22).
    await createArticle(
      { folder: folder.id, slug: "About", title: "Old About" },
      { context: { foldersInternal: true } }
    );
    const shouted = String(folder.slug).toUpperCase();

    // The folder part gets the case redirect; the page segment keeps its own case.
    expect(await resolve({ path: `/${shouted}/About` })).toEqual({
      status: 301,
      to: `/${folder.slug}/About`,
      type: "redirect",
    });
    expect(titleOf(await resolve({ path: `/${folder.slug}/About` }))).toBe("Old About");
    // A repeated slash is redirected for a legacy segment as well.
    expect(await resolve({ path: `/${folder.slug}//About` })).toEqual({
      status: 301,
      to: `/${folder.slug}/About`,
      type: "redirect",
    });
  });

  it("answers a segment saved with capitals at its own path first", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Legacy", slug: uniqueName("legacy") });
    // Saved before the plugin: an internal write skips the segment pattern (decision 22).
    await createArticle(
      { folder: folder.id, slug: "About", title: "Old About" },
      { context: { foldersInternal: true } }
    );
    await createArticle(
      { folder: folder.id, slug: "Team", title: "Old Team" },
      { context: { foldersInternal: true } }
    );
    await createArticle({ folder: folder.id, slug: "team", title: "New Team" });

    const exact = await resolve({ path: `/${folder.slug}/About` });
    expect(exact).toMatchObject({ fullPath: `/${folder.slug}/About`, type: "page" });
    expect(titleOf(exact)).toBe("Old About");
    // Its lowercase form is a different path until repair writes a redirect.
    expect(await resolve({ path: `/${folder.slug}/about` })).toEqual({ type: "notFound" });
    // An exact match wins over the lowercase page, which a case-different request redirects to.
    expect(titleOf(await resolve({ path: `/${folder.slug}/Team` }))).toBe("Old Team");
    expect(titleOf(await resolve({ path: `/${folder.slug}/team` }))).toBe("New Team");
  });

  it("serves only what the user may read", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Members", slug: uniqueName("members") });
    await createPage({ folder: folder.id, slug: "area", title: "Area" });
    const path = `/${folder.slug}/area`;

    // The dev pages collection has the default access: a signed-in user reads.
    expect(await resolve({ path })).toEqual({ type: "notFound" });
    expect(titleOf(await resolve({ path, user: editor }))).toBe("Area");
    expect(titleOf(await resolve({ overrideAccess: true, path }))).toBe("Area");
  });

  it("a redirect whose target the reader cannot see is notFound", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Before", slug: uniqueName("before") });
    await createPage({ folder: folder.id, slug: "private", title: "Private" });
    const oldPath = `/${folder.slug}/private`;
    await renameFolder(folder.id, uniqueName("after"));
    const renamed = await payload.findByID({ collection: "folders", id: folder.id });

    expect(await resolve({ path: oldPath, user: editor })).toEqual({
      status: 301,
      to: `${renamed.fullPath}/private`,
      type: "redirect",
    });
    // For a visitor the new path leads nowhere, so a redirect to it would only be a second 404.
    expect(await resolve({ path: oldPath })).toEqual({ type: "notFound" });
  });

  it("resolves a published page, and a draft change only for a draft read", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, {
      name: "Draftable",
      slug: uniqueName("draftable"),
    });
    const page = await createArticle({ folder: folder.id, slug: "live", title: "Live" });
    await updateArticle(page.id, { slug: "next", title: "Next" }, { draft: true });

    expect(titleOf(await resolve({ path: `/${folder.slug}/live` }))).toBe("Live");
    expect(await resolve({ path: `/${folder.slug}/next` })).toEqual({ type: "notFound" });
    const draftRead = await resolve({ draft: true, path: `/${folder.slug}/next`, user: editor });
    expect(titleOf(draftRead)).toBe("Next");
    expect(await resolve({ draft: true, path: `/${folder.slug}/live`, user: editor })).toEqual({
      type: "notFound",
    });
  });

  it("follows the locale: fallback segments, own segments and an unpublished locale", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Locales", slug: uniqueName("locales") });
    const fallback = await createArticle({ folder: folder.id, slug: "shared", title: "Shared" });
    const own = await createArticle({ folder: folder.id, slug: "own", title: "Own" });
    await updateArticle(
      own.id,
      { _status: "published", slug: "eigen", title: "Eigen" },
      { locale: "de" }
    );
    const hidden = await createArticle({ folder: folder.id, slug: "hidden", title: "Hidden" });
    await updateArticle(hidden.id, { _status: "published", title: "Versteckt" }, { locale: "de" });
    await updateArticle(hidden.id, { _status: "draft" }, { locale: "de" });
    const base = `/${folder.slug}`;

    // No de slug of its own: de answers to the default locale's segment, served through the fallback.
    expect(titleOf(await resolve({ locale: "de", path: `${base}/shared` }))).toBe("Shared");
    expect(titleOf(await resolve({ locale: "en", path: `${base}/shared` }))).toBe("Shared");
    // An own de segment answers in de only, and its en segment answers in en only.
    expect(titleOf(await resolve({ locale: "de", path: `${base}/eigen` }))).toBe("Eigen");
    // The old fallback URL of the page that took its own de slug redirects to it, as a move does.
    expect(await resolve({ locale: "de", path: `${base}/own` })).toEqual({
      status: 301,
      to: `${base}/eigen`,
      type: "redirect",
    });
    expect(await resolve({ locale: "en", path: `${base}/eigen` })).toEqual({ type: "notFound" });
    expect(titleOf(await resolve({ locale: "en", path: `${base}/own` }))).toBe("Own");
    // A de status of its own that is draft keeps the page out of de whatever en does (decision 24).
    expect(await resolve({ locale: "de", path: `${base}/hidden` })).toEqual({ type: "notFound" });
    expect(titleOf(await resolve({ locale: "en", path: `${base}/hidden` }))).toBe("Hidden");
    expect(fallback.id).toBeGreaterThan(0);
    // A locale that is not configured is a bad request.
    await expect(resolve({ locale: "fr", path: base })).rejects.toThrow("not a configured locale");
  });
});

describe("resolve endpoint", () => {
  it("answers 200 for a page and a redirect, and 404 for nothing, with no sign-in", async () => {
    const { config, payload } = harness;
    const folder = await createFolder(payload, { name: "Rest", slug: uniqueName("rest") });
    await createArticle({ folder: folder.id, slug: "page", title: "Rest Page" });
    await createArticle({ folder: folder.id, slug: "later", status: "draft", title: "Later" });
    const get = (query: string, options: { anonymous?: boolean } = {}) =>
      callEndpoint<Record<string, unknown>>({
        anonymous: options.anonymous ?? true,
        config,
        path: `/folders-tree/resolve?${query}`,
        payload,
      });

    const page = await get(`path=/${folder.slug}/page&depth=0`);
    expect(page.status).toBe(200);
    expect(page.body).toMatchObject({
      alternates: { de: `/${folder.slug}/page`, en: `/${folder.slug}/page` },
      collection: "articles",
      doc: { title: "Rest Page" },
      fullPath: `/${folder.slug}/page`,
      locale: "en",
      type: "page",
    });
    const redirect = await get(`path=/${String(folder.slug).toUpperCase()}/page`);
    expect(redirect.status).toBe(200);
    expect(redirect.body).toEqual({
      status: 301,
      to: `/${folder.slug}/page`,
      type: "redirect",
    });
    const missing = await get(`path=/${folder.slug}/nope`);
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ type: "notFound" });
    // draft=true does nothing for an anonymous caller, and finds the draft for a signed-in one.
    expect((await get(`path=/${folder.slug}/later&draft=true`)).status).toBe(404);
    const signedIn = await get(`path=/${folder.slug}/later&draft=true`, { anonymous: false });
    expect(signedIn.status).toBe(200);
    expect(signedIn.body).toMatchObject({ doc: { title: "Later" }, type: "page" });
    expect((await get("locale=fr&path=/")).status).toBe(400);
    expect((await get("draft=maybe&path=/")).status).toBe(400);
    expect((await get("depth=99&path=/")).status).toBe(400);
    expect((await get("locale=de")).status).toBe(400);
  });
});
