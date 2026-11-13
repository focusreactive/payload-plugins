import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getAllPaths, getTree, resolvePath } from "../../src/server/index.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { createFolder, uniqueName } from "../helpers/treeFixtures.js";

// A page that is live in one locale only: published in de, never in en. The rule (decision 19 and
// 24): publishing in a locale needs every live locale to have a segment, its own or the default
// locale's live one through fallback. The default locale's segment is required only when some live
// locale would fall back to it.
let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
});

afterAll(async () => {
  await harness?.destroy();
});

type EndpointError = { errors?: Array<{ data?: { errors?: Array<{ message: string }> } }> };

const call = <TBody = Record<string, unknown>>(
  method: "PATCH" | "POST",
  path: string,
  body: unknown
) => callEndpoint<TBody>({ body, config: harness.config, method, path, payload: harness.payload });

const messagesOf = (body: EndpointError): string[] =>
  (body.errors ?? []).flatMap((error) => (error.data?.errors ?? []).map((item) => item.message));

const createDraftInBothLocales = async (data: {
  /** A title that derives no slug (`!!!`) keeps the de segment empty on create. */
  deTitle?: string;
  deSlug?: string;
  enTitle?: string;
  enSlug?: string;
  folder: number;
}) => {
  const created = await call<{ doc: { id: number } }>("POST", "/pages?locale=all&draft=true", {
    _status: "draft",
    folder: data.folder,
    slug: {
      ...(data.enSlug === undefined ? {} : { en: data.enSlug }),
      ...(data.deSlug === undefined ? {} : { de: data.deSlug }),
    },
    title: { de: data.deTitle ?? "Probe", en: data.enTitle ?? "Probe" },
  });
  expect(created.status).toBe(201);

  return created.body.doc.id;
};

describe("a page live only in de", () => {
  it("a de editor publishes a page created in de, with the en slug saved but not published", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Probes", slug: uniqueName("probes") });
    const id = await createDraftInBothLocales({
      deSlug: "probe",
      enSlug: "probe",
      folder: folder.id,
    });

    const published = await call("PATCH", `/pages/${id}?locale=de`, { _status: "published" });

    expect(published.status).toBe(200);
    const base = `/${folder.slug}`;
    // de answers at its own segment and en is not found: the page was never published in en.
    const inDe = await resolvePath(payload, {
      locale: "de",
      overrideAccess: true,
      path: `${base}/probe`,
    });
    expect(inDe).toMatchObject({
      alternates: { de: `${base}/probe` },
      fullPath: `${base}/probe`,
      locale: "de",
      type: "page",
    });
    expect(
      await resolvePath(payload, { locale: "en", overrideAccess: true, path: `${base}/probe` })
    ).toEqual({ type: "notFound" });
    // paths: one row, in de only.
    const rows = await getAllPaths(payload, {
      locale: "all",
      overrideAccess: true,
      under: base,
    });
    expect(rows.map(({ fullPath, locale }) => ({ fullPath, locale }))).toEqual([
      { fullPath: `${base}/probe`, locale: "de" },
    ]);
    // tree: the page is in the de tree and not in the en tree.
    const titlesIn = async (locale: "de" | "en") =>
      (await getTree(payload, { depth: 3, locale, overrideAccess: true, root: folder.id })).map(
        (node) => node.title
      );
    expect(await titlesIn("de")).toEqual(["Probe"]);
    expect(await titlesIn("en")).toEqual([]);
    // The REST paths endpoint pages through it as an anonymous-free signed-in call.
    const viaEndpoint = await callEndpoint<{ docs: Array<{ locale: string }> }>({
      config: harness.config,
      path: `/folders-tree/paths?locale=all&under=${base}`,
      payload,
    });
    expect(viaEndpoint.body.docs.map((row) => row.locale)).toEqual(["de"]);
  });

  it("a page with no en segment at all publishes in de with its own de segment", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Nur", slug: uniqueName("nur") });
    const id = await createDraftInBothLocales({
      deSlug: "nur-de",
      enTitle: "!!!",
      folder: folder.id,
    });

    const published = await call("PATCH", `/pages/${id}?locale=de`, { _status: "published" });

    expect(published.status).toBe(200);
    expect(
      await resolvePath(payload, {
        locale: "de",
        overrideAccess: true,
        path: `/${folder.slug}/nur-de`,
      })
    ).toMatchObject({ alternates: { de: `/${folder.slug}/nur-de` }, type: "page" });
    // Publishing en next needs an en segment, because en is live then.
    const inEn = await call<EndpointError>("PATCH", `/pages/${id}?locale=en`, {
      _status: "published",
    });
    expect(inEn.status).toBe(400);
    expect(messagesOf(inEn.body)).toEqual([
      "A page needs a slug in the default locale (en); save it in en first",
    ]);
  });

  it("renaming the de slug of a de-only page redirects the old de path and never an en one", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Moves", slug: uniqueName("moves") });
    const id = await createDraftInBothLocales({
      deSlug: "alt",
      enSlug: "alt",
      folder: folder.id,
    });
    expect((await call("PATCH", `/pages/${id}?locale=de`, { _status: "published" })).status).toBe(
      200
    );
    const base = `/${folder.slug}`;

    const renamed = await call("PATCH", `/pages/${id}?locale=de`, {
      _status: "published",
      slug: "neu",
    });

    expect(renamed.status).toBe(200);
    expect(
      await resolvePath(payload, { locale: "de", overrideAccess: true, path: `${base}/alt` })
    ).toEqual({ status: 301, to: `${base}/neu`, type: "redirect" });
    expect(
      await resolvePath(payload, { locale: "en", overrideAccess: true, path: `${base}/alt` })
    ).toEqual({ type: "notFound" });
    expect(
      await resolvePath(payload, { locale: "de", overrideAccess: true, path: `${base}/neu` })
    ).toMatchObject({ type: "page" });
  });

  it("a de-only page with no own de segment and no live en is refused, with a message that says what to do", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Gaps", slug: uniqueName("gaps") });
    const id = await createDraftInBothLocales({
      deTitle: "!!!",
      enSlug: "only-en",
      folder: folder.id,
    });

    const refused = await call<EndpointError>("PATCH", `/pages/${id}?locale=de`, {
      _status: "published",
    });

    expect(refused.status).toBe(400);
    expect(messagesOf(refused.body)).toEqual([
      "A page published in de needs a de slug, or a published en slug to fall back to: give it a de slug or publish it in en first",
    ]);
    const stillDraft = await payload.findByID({
      collection: "pages",
      depth: 0,
      draft: true,
      id,
      locale: "all" as never,
      overrideAccess: true,
    });
    expect(stillDraft._status).not.toBe("published");
    // Giving it a de slug in the same save is the other way out.
    const fixed = await call("PATCH", `/pages/${id}?locale=de`, {
      _status: "published",
      slug: "nur-de",
    });
    expect(fixed.status).toBe(200);
    expect(
      await resolvePath(payload, {
        locale: "de",
        overrideAccess: true,
        path: `/${folder.slug}/nur-de`,
      })
    ).toMatchObject({ type: "page" });
  });

  it("the de path must still be unique: another page's de path blocks the publish", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { name: "Clash", slug: uniqueName("clash") });
    const first = await createDraftInBothLocales({
      deSlug: "gleich",
      enSlug: "same-a",
      folder: folder.id,
    });
    expect(
      (await call("PATCH", `/pages/${first}?locale=de`, { _status: "published" })).status
    ).toBe(200);
    const second = await createDraftInBothLocales({
      deSlug: "gleich",
      enSlug: "same-b",
      folder: folder.id,
    });

    const refused = await call<EndpointError>("PATCH", `/pages/${second}?locale=de`, {
      _status: "published",
    });

    expect(refused.status).toBe(400);
    expect(messagesOf(refused.body)).toEqual([
      `/${folder.slug}/gleich is already used by Probe (published)`,
    ]);
    // The same en slug is free: the first page is not live in en.
    const inEn = await call("PATCH", `/pages/${second}?locale=en`, { _status: "published" });
    expect(inEn.status).toBe(200);
  });
});
