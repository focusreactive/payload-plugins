import type { Payload } from "payload";
import { beforeAll, describe, expect, it } from "vitest";

import { bootAuditPayload, createUser, loginHeaders, rest } from "./bootAuditPayload";
import type { AuditTestPayload } from "./bootAuditPayload";

const READ_METHODS = [
  "find",
  "findOne",
  "findVersions",
  "findGlobal",
  "findGlobalVersions",
  "findDistinct",
  "queryDrafts",
  "count",
  "countVersions",
  "countGlobalVersions",
] as const;

type ReadArgs = { collection?: string; global?: string; slug?: string };
type Reads = string[];
type ReadsPerOperation = Record<string, Reads>;

const BULK_TITLE = "bulk";

function readRecorder(payload: Payload) {
  let recording: Reads | undefined;
  const db = payload.db as unknown as Record<string, unknown>;
  for (const method of READ_METHODS) {
    const original = db[method];
    if (typeof original !== "function") continue;
    db[method] = function recorded(this: unknown, args: ReadArgs) {
      recording?.push(`${method}:${args?.collection ?? args?.global ?? args?.slug}`);
      return (original as (args: ReadArgs) => Promise<unknown>).call(this ?? db, args);
    };
  }
  return async (operation: () => Promise<unknown>): Promise<Reads> => {
    recording = [];
    try {
      await operation();
      return recording;
    } finally {
      recording = undefined;
    }
  };
}

async function readsPerOperation(payload: Payload): Promise<ReadsPerOperation> {
  const readsOf = readRecorder(payload);
  const user = await createUser(payload, "reads@x.io");
  const signedIn = await loginHeaders(payload, "reads@x.io");

  const autosaveHeader = async (body: Record<string, unknown>) => {
    const res = await rest(payload, "POST", "/globals/header?draft=true&autosave=true", {
      body,
      headers: signedIn,
    });
    if (res.status !== 200) throw new Error(`header autosave failed with ${res.status}`);
  };
  const updateHeader = (data: Record<string, unknown>, options = {}) =>
    payload.updateGlobal({ slug: "header" as never, data: data as never, ...options });
  const createPage = (data: Record<string, unknown>, options = {}) =>
    payload.create({ collection: "pages" as never, data: data as never, ...options });
  const updatePage = (id: unknown, data: Record<string, unknown>, options = {}) =>
    payload.update({
      collection: "pages" as never,
      id: id as string,
      data: data as never,
      ...options,
    });
  const updateBulkPages = (data: Record<string, unknown>, options = {}) =>
    payload.update({
      collection: "pages" as never,
      where: { title: { equals: BULK_TITLE } },
      data: data as never,
      ...options,
    });

  const reads: ReadsPerOperation = {};

  await autosaveHeader({ title: "T1", tagline: "G1" });
  reads.globalFirstPublish = await readsOf(() => updateHeader({ _status: "published" }));
  await autosaveHeader({ tagline: "G2" });
  reads.globalPublishAfterAutosave = await readsOf(() => updateHeader({ _status: "published" }));
  reads.globalDraftSave = await readsOf(() => updateHeader({ title: "T2" }, { draft: true }));
  reads.globalUnpublish = await readsOf(() => updateHeader({ _status: "draft" }));
  reads.globalPublishAfterUnpublish = await readsOf(() => updateHeader({ _status: "published" }));

  const bulkPages = await Promise.all(
    [1, 2].map(() => createPage({ title: BULK_TITLE, body: "draft" }, { draft: true }))
  );
  reads.bulkPublish = await readsOf(() => updateBulkPages({ _status: "published" }));
  await updatePage(bulkPages[0]?.id, { body: "newer draft" }, { draft: true, autosave: true });
  reads.bulkUnpublish = await readsOf(() => updateBulkPages({ _status: "draft" }));
  reads.bulkDraftSave = await readsOf(() =>
    updateBulkPages({ body: "bulk draft" }, { draft: true })
  );
  reads.bulkPublishOverDrafts = await readsOf(() =>
    updateBulkPages({ _status: "published" }, { draft: true })
  );

  const single = await createPage({ title: "single", body: "draft" }, { draft: true });
  await updatePage(single.id, { body: "autosaved" }, { draft: true, autosave: true });
  reads.singlePublishAfterAutosave = await readsOf(() =>
    updatePage(single.id, { _status: "published" })
  );
  await updatePage(single.id, { body: "newer draft" }, { draft: true });
  reads.singleUnpublishBehindDraft = await readsOf(() =>
    updatePage(single.id, { _status: "draft" })
  );

  const inGermanFallingBackToEnglish = { locale: "de", fallbackLocale: "en" } as const;
  await payload.updateGlobal({
    slug: "localized-settings" as never,
    data: { motto: "Same" } as never,
  });
  reads.localizedGlobalSaveWithFallback = await readsOf(() =>
    payload.updateGlobal({
      slug: "localized-settings" as never,
      data: { motto: "Same" } as never,
      ...inGermanFallingBackToEnglish,
    })
  );
  reads.localizedDocSaveWithFallback = await readsOf(() =>
    payload.update({
      collection: "users" as never,
      id: user.id,
      data: { nickname: "Brand" } as never,
      ...inGermanFallingBackToEnglish,
    })
  );
  const postGlobal = async (path: string, body: Record<string, unknown>) => {
    const res = await rest(payload, "POST", `/globals/${path}`, { body, headers: signedIn });
    if (res.status !== 200) throw new Error(`global save ${path} failed with ${res.status}`);
  };
  const updateGlobal = async (slug: string, data: Record<string, unknown>, options = {}) =>
    (await payload.updateGlobal({
      slug: slug as never,
      data: data as never,
      ...options,
    })) as unknown as { items?: { id: string }[] };

  reads.nonDraftsGlobalSave = await readsOf(() => updateGlobal("settings", { siteName: "S" }));
  await updateGlobal("secret-settings", { visible: "v", token: "t1", links: [{ secret: "s" }] });
  reads.hiddenGlobalFieldSave = await readsOf(() => postGlobal("secret-settings", { token: "t2" }));

  const banner = await updateGlobal("banner", {
    text: "T",
    motto: "Same",
    token: "t",
    items: [{ label: "Label" }],
    _status: "published",
  });
  reads.draftsGlobalDraftSave = await readsOf(() =>
    updateGlobal("banner", { text: "draft" }, { draft: true })
  );
  reads.draftsGlobalSaveWithAutosaveArgument = await readsOf(() =>
    postGlobal("banner?draft=true&autosave=true", { text: "autosave argument" })
  );
  reads.draftsGlobalPublish = await readsOf(() => updateGlobal("banner", { _status: "published" }));
  reads.localizedDraftsGlobalSaveWithFallback = await readsOf(() =>
    updateGlobal(
      "banner",
      { motto: "Same", token: "t", items: [{ id: banner.items?.[0]?.id, label: "Label" }] },
      { ...inGermanFallingBackToEnglish, draft: true }
    )
  );
  const rows = await updateGlobal("localized-rows", { items: [{ label: "Label" }] });
  reads.localizedRowsGlobalSaveWithFallback = await readsOf(() =>
    updateGlobal(
      "localized-rows",
      { items: [{ id: rows.items?.[0]?.id, label: "Label" }] },
      inGermanFallingBackToEnglish
    )
  );

  await payload.updateGlobal({
    slug: "promo" as never,
    data: { title: "Title", note: "Note", _status: "published" } as never,
  });
  await postGlobal("promo?draft=true&autosave=true&locale=de", { title: "Titel" });
  reads.localizedAutosaveGlobalPublish = await readsOf(() =>
    payload.updateGlobal({ slug: "promo" as never, data: { _status: "published" } as never })
  );

  const createPublishedAuthDoc = (collection: string, email: string) =>
    payload.create({
      collection: collection as never,
      data: { email, password: "password123", role: "editor", _status: "published" } as never,
    });
  const updateAuthDoc = (collection: string, id: unknown, data: object, options = {}) =>
    payload.update({
      collection: collection as never,
      id: id as string,
      data: data as never,
      ...options,
    });
  const contractor = await createPublishedAuthDoc("contractors", "reads-contractor@x.io");
  await updateAuthDoc("contractors", contractor.id, { role: "admin" }, { draft: true });
  reads.authDraftsPublishOverDraft = await readsOf(() =>
    updateAuthDoc("contractors", contractor.id, { _status: "published" })
  );
  reads.authDraftsDraftSave = await readsOf(() =>
    updateAuthDoc("contractors", contractor.id, { role: "editor" }, { draft: true })
  );
  reads.authDraftsPlainSaveOverDraft = await readsOf(() =>
    updateAuthDoc("contractors", contractor.id, {})
  );
  const staff = await createPublishedAuthDoc("staff", "reads-staff@x.io");
  await updateAuthDoc("staff", staff.id, { role: "admin" }, { draft: true, autosave: true });
  reads.authAutosavePublishAfterAutosave = await readsOf(() =>
    updateAuthDoc("staff", staff.id, { _status: "published" })
  );

  reads.updateWithAutosaveArgument = await readsOf(() =>
    payload.update({
      collection: "users" as never,
      id: user.id,
      data: { role: "admin" } as never,
      autosave: true,
    })
  );

  return reads;
}

async function readsOfBoot(options: Parameters<typeof bootAuditPayload>[0]) {
  let ctx: AuditTestPayload | undefined;
  try {
    ctx = await bootAuditPayload(options);
    return await readsPerOperation(ctx.payload);
  } finally {
    await ctx?.cleanup();
  }
}

const withoutOne = (reads: Reads, extra: string): Reads => {
  const index = reads.indexOf(extra);
  return index === -1 ? reads : [...reads.slice(0, index), ...reads.slice(index + 1)];
};

const withoutEach = (reads: Reads, extra: string, times: number): Reads =>
  Array.from({ length: times }).reduce<Reads>((remaining) => withoutOne(remaining, extra), reads);

let withoutPlugin: ReadsPerOperation;
let withPlugin: ReadsPerOperation;
beforeAll(async () => {
  withoutPlugin = await readsOfBoot({ plugin: { enabled: false }, key: "reads-without-plugin" });
  withPlugin = await readsOfBoot({ key: "reads-with-plugin" });
}, 240_000);

describe("database reads the plugin adds to an operation", () => {
  it.each([
    "globalFirstPublish",
    "globalPublishAfterAutosave",
    "globalDraftSave",
    "globalUnpublish",
    "globalPublishAfterUnpublish",
    "bulkPublish",
    "bulkUnpublish",
    "bulkDraftSave",
    "bulkPublishOverDrafts",
    "localizedGlobalSaveWithFallback",
    "localizedDocSaveWithFallback",
    "nonDraftsGlobalSave",
    "hiddenGlobalFieldSave",
    "draftsGlobalDraftSave",
    "draftsGlobalSaveWithAutosaveArgument",
    "draftsGlobalPublish",
    "localizedDraftsGlobalSaveWithFallback",
    "localizedRowsGlobalSaveWithFallback",
    "updateWithAutosaveArgument",
    "localizedAutosaveGlobalPublish",
    "authDraftsDraftSave",
    "authDraftsPublishOverDraft",
  ])("%s reads exactly what Payload reads without the plugin", (operation) => {
    expect(withoutPlugin[operation]?.length).toBeGreaterThan(0);
    expect(withPlugin[operation]).toEqual(withoutPlugin[operation]);
  });

  it.each([
    ["singlePublishAfterAutosave", "findOne:pages", 1],
    ["singleUnpublishBehindDraft", "findOne:pages", 1],
    ["authDraftsPlainSaveOverDraft", "findOne:contractors", 1],
    ["authAutosavePublishAfterAutosave", "findOne:staff", 1],
  ] as const)("%s adds only %s, once per document", (operation, extraRead, documents) => {
    const audited = withPlugin[operation] ?? [];
    expect(audited).toHaveLength((withoutPlugin[operation]?.length ?? 0) + documents);
    expect(audited.filter((read) => read === extraRead)).toHaveLength(
      (withoutPlugin[operation] ?? []).filter((read) => read === extraRead).length + documents
    );
    expect(withoutEach(audited, extraRead, documents)).toEqual(withoutPlugin[operation]);
  });
});
