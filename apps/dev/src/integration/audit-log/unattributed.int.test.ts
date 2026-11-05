import { withAuditActor } from "@focus-reactive/payload-plugin-audit-log";
import { createLocalReq, initTransaction, killTransaction } from "payload";
import type { Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  AUDIT_SLUG,
  authCookie,
  bootAuditPayload,
  createTextUpload,
  createUser,
  eventsWithAction,
  isoNow,
  MAX_LOGIN_ATTEMPTS,
  PASSWORD,
  POST_HOOK_FLAGS,
  rest,
  unattributedEvents,
} from "./bootAuditPayload";
import type { AuditTestPayload } from "./bootAuditPayload";

let ctx: AuditTestPayload;
beforeAll(async () => {
  ctx = await bootAuditPayload();
});
afterAll(async () => {
  await ctx?.cleanup();
});

const POSTS = "posts" as never;
const PAGES = "pages" as never;
const USERS = "users" as never;

const unattributedWriteSummaries = async () =>
  (await unattributedEvents(ctx.payload)).map(
    (event) =>
      `${event.metadata?.method} ${event.target?.kind}:${event.target?.slug}:${event.target?.docId ?? ""}`
  );

const unattributedCount = async () => (await unattributedEvents(ctx.payload)).length;

async function startsTransactions(payload: Payload): Promise<boolean> {
  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) return false;
  await payload.db.rollbackTransaction(transactionID);
  return true;
}

async function loginRefreshAndLogOutOverRest(payload: Payload, email: string) {
  const login = await rest(payload, "POST", "/users/login", {
    body: { email, password: PASSWORD },
  });
  expect(login.status).toBe(200);
  const cookie = authCookie(login);
  expect(
    (await rest(payload, "POST", "/users/refresh-token", { headers: { cookie } })).status
  ).toBe(200);
  expect((await rest(payload, "POST", "/users/logout", { headers: { cookie } })).status).toBe(200);
}

async function lockOutWithWrongPasswordsThenUnlock(payload: Payload, email: string) {
  for (let attempt = 0; attempt < MAX_LOGIN_ATTEMPTS; attempt += 1) {
    const res = await rest(payload, "POST", "/users/login", {
      body: { email, password: "wrong-password" },
    });
    expect(res.status).toBe(401);
  }
  await payload.unlock({ collection: USERS, data: { email } as never, overrideAccess: true });
}

async function resetPassword(payload: Payload, email: string) {
  const token = await payload.forgotPassword({
    collection: USERS,
    data: { email } as never,
    disableEmail: true,
  });
  await payload.resetPassword({
    collection: USERS,
    data: { token: String(token), password: "another-password" },
    overrideAccess: true,
  });
}

async function registerAndVerifyMember(payload: Payload, email: string) {
  const member = await payload.create({
    collection: "members" as never,
    data: { email, password: PASSWORD } as never,
  });
  const { _verificationToken } = (await payload.findByID({
    collection: "members" as never,
    id: member.id,
    showHiddenFields: true,
  })) as { _verificationToken?: string };
  await payload.verifyEmail({ collection: "members" as never, token: String(_verificationToken) });
}

async function bulkUpdateThenBulkDeleteByWhere(payload: Payload) {
  await payload.create({ collection: POSTS, data: { title: "bulk" } as never });
  await payload.create({ collection: POSTS, data: { title: "bulk" } as never });
  await payload.update({
    collection: POSTS,
    where: { title: { equals: "bulk" } },
    data: { title: "bulk2" } as never,
  });
  await payload.delete({ collection: POSTS, where: { title: { equals: "bulk2" } } });
}

async function trashThenRestore(payload: Payload, id: string | number) {
  await payload.update({ collection: POSTS, id, data: { deletedAt: isoNow() } as never });
  await payload.update({ collection: POSTS, id, data: { deletedAt: null } as never, trash: true });
}

async function editRelationshipAndJoin(
  payload: Payload,
  postId: string | number,
  pageId: string | number
) {
  const comment = await payload.create({
    collection: "comments" as never,
    data: { text: "c", post: postId, page: pageId } as never,
  });
  await payload.update({
    collection: "comments" as never,
    id: comment.id,
    data: { post: null } as never,
  });
  await payload.update({ collection: PAGES, id: pageId, data: { related: postId } as never });
}

async function createUpdateAndDeleteWithExplicitReq(payload: Payload) {
  const req = await createLocalReq({}, payload);
  const post = await payload.create({ collection: POSTS, data: { title: "R" } as never, req });
  await payload.update({ collection: POSTS, id: post.id, data: { title: "R2" } as never, req });
  await payload.delete({ collection: POSTS, id: post.id, req });
}

async function createThenUpdateSettingsGlobal(payload: Payload) {
  await payload.updateGlobal({ slug: "settings" as never, data: { siteName: "Y" } as never });
  await payload.updateGlobal({ slug: "settings" as never, data: { siteName: "Z" } as never });
}

async function draftPublishUpdateAndRestoreHeaderGlobal(payload: Payload) {
  const header = "header" as never;
  await payload.updateGlobal({ slug: header, data: { title: "H1" } as never, draft: true });
  await payload.updateGlobal({ slug: header, data: { _status: "published" } as never });
  await payload.updateGlobal({ slug: header, data: { title: "H2" } as never });
  const versions = await payload.findGlobalVersions({ slug: header, sort: "createdAt" });
  await payload.restoreGlobalVersion({ slug: header, id: String(versions.docs[0]?.id) });
}

async function savePreferenceWithUserFromReq(payload: Payload, user: Record<string, unknown>) {
  await payload.create({
    collection: "payload-preferences" as never,
    data: { key: "pages-list", value: { limit: 10 } } as never,
    user: { ...user, collection: "users" } as never,
  });
}

async function lockDocumentWithUserInData(
  payload: Payload,
  user: Record<string, unknown>,
  pageId: string | number
) {
  await payload.create({
    collection: "payload-locked-documents" as never,
    data: {
      document: { relationTo: "pages", value: pageId },
      globalSlug: null,
      user: { relationTo: "users", value: user.id },
    } as never,
    user: { ...user, collection: "users" } as never,
  });
}

async function runDueSchedulePublish(payload: Payload, pageId: string | number) {
  await payload.jobs.queue({
    task: "schedulePublish" as never,
    input: { type: "publish", doc: { relationTo: "pages", value: String(pageId) } } as never,
    waitUntil: new Date(Date.now() - 1000),
  });
  await payload.jobs.run();
}

describe("writes Payload makes on its own are not unattributed", () => {
  it("auth: REST login, refresh, logout, lockout, unlock, password reset, email verification; the failed REST attempts are on record", async () => {
    const { payload } = ctx;
    await createUser(payload, "a@x.io");

    await loginRefreshAndLogOutOverRest(payload, "a@x.io");
    await lockOutWithWrongPasswordsThenUnlock(payload, "a@x.io");
    await resetPassword(payload, "a@x.io");
    await registerAndVerifyMember(payload, "m@x.io");

    expect(await unattributedWriteSummaries()).toEqual([]);
    const failed = await eventsWithAction(payload, "auth.login_failed");
    expect(failed.map((event) => event.metadata?.reason)).toEqual(
      Array.from({ length: MAX_LOGIN_ATTEMPTS }, () => "invalid_credentials")
    );
    expect(failed[0]?.actor).toMatchObject({ type: "anonymous", label: "a@x.io" });
  });

  it("documents: CRUD, drafts, autosave, publish, unpublish, duplicate, restore, bulk, trash, uploads, relations", async () => {
    const { payload } = ctx;
    const post = await payload.create({ collection: POSTS, data: { title: "N" } as never });
    await payload.update({ collection: POSTS, id: post.id, data: { title: "N2" } as never });
    await payload.update({
      collection: POSTS,
      id: post.id,
      data: { title: "N3" } as never,
      draft: true,
    });
    await payload.update({
      collection: POSTS,
      id: post.id,
      data: { _status: "published" } as never,
    });
    await payload.update({ collection: POSTS, id: post.id, data: { _status: "draft" } as never });
    await payload.duplicate({ collection: POSTS, id: post.id });
    const versions = await payload.findVersions({
      collection: POSTS,
      where: { parent: { equals: post.id } },
      sort: "createdAt",
    });
    await payload.restoreVersion({ collection: POSTS, id: String(versions.docs[0]?.id) });

    const page = await payload.create({
      collection: PAGES,
      data: { title: "Pg" } as never,
      draft: true,
    });
    await payload.update({
      collection: PAGES,
      id: page.id,
      data: { body: "tick" } as never,
      draft: true,
      autosave: true,
    });
    await payload.update({
      collection: PAGES,
      id: page.id,
      data: { _status: "published" } as never,
    });

    await bulkUpdateThenBulkDeleteByWhere(payload);
    await trashThenRestore(payload, post.id);
    await createTextUpload(payload);
    await editRelationshipAndJoin(payload, post.id, page.id);
    await createUpdateAndDeleteWithExplicitReq(payload);
    await payload.delete({ collection: POSTS, id: post.id });

    expect(await unattributedWriteSummaries()).toEqual([]);
  });

  it("globals, preferences, document locks and a scheduled publish", async () => {
    const { payload } = ctx;
    await createThenUpdateSettingsGlobal(payload);
    await draftPublishUpdateAndRestoreHeaderGlobal(payload);

    const user = await createUser(payload, "p@x.io");
    const page = await payload.create({
      collection: PAGES,
      data: { title: "Sched" } as never,
      draft: true,
    });
    await savePreferenceWithUserFromReq(payload, user);
    await lockDocumentWithUserInData(payload, user, page.id);
    await runDueSchedulePublish(payload, page.id);

    const published = (await payload.findByID({ collection: PAGES, id: page.id })) as {
      _status?: string;
    };
    expect(published._status).toBe("published");
    expect(await unattributedWriteSummaries()).toEqual([]);
  });
});

describe("writes that bypass Payload operations", () => {
  it("a seed's payload.db.updateOne without req is one unattributed event", async () => {
    const { payload } = ctx;
    const before = await unattributedCount();
    const page = await payload.create({ collection: PAGES, data: { title: "D" } as never });
    await withAuditActor({ type: "seed", label: "seed.ts" }, () =>
      payload.db.updateOne({ collection: "pages", id: page.id, data: { title: "x" } })
    );

    const log = await unattributedEvents(payload);
    expect(log).toHaveLength(before + 1);
    expect(log.at(-1)).toMatchObject({
      action: "system.unattributed_write",
      actor: { type: "seed", source: "als" },
      target: { kind: "collection", slug: "pages", docId: String(page.id) },
      changes: ["title"],
      metadata: { method: "updateOne" },
    });
  });

  it("writes to the audit collection itself are not recorded", async () => {
    const { payload } = ctx;
    const before = await unattributedCount();
    await payload.db.create({
      collection: AUDIT_SLUG,
      data: {
        occurredAt: isoNow(),
        action: "system.seed",
        actor: { type: "system", source: "inferred" },
        via: "local",
        target: { kind: "audit", slug: AUDIT_SLUG },
      },
    });
    expect(await unattributedCount()).toBe(before);
  });

  it("a hook writing raw to another document with the same req is attributed to that document only", async () => {
    const { payload } = ctx;
    const other = await payload.create({ collection: POSTS, data: { title: "Other" } as never });
    const doc = await payload.create({ collection: POSTS, data: { title: "Main" } as never });
    const before = await unattributedCount();
    await payload.update({
      collection: POSTS,
      id: doc.id,
      data: { title: "Main2" } as never,
      context: { [POST_HOOK_FLAGS.rawUpdatePostWithId]: other.id },
    });

    const log = await unattributedEvents(payload);
    expect(log).toHaveLength(before + 1);
    expect(log.at(-1)?.target).toMatchObject({ slug: "posts", docId: String(other.id) });
  });

  it("a raw create in a hook of a Payload create of that collection is unattributed, the create itself is not", async () => {
    const { payload } = ctx;
    const before = await unattributedCount();
    const post = await payload.create({
      collection: POSTS,
      data: { title: "Created by Payload" } as never,
      context: { [POST_HOOK_FLAGS.rawCreatePostTitled]: "Created raw" },
    });

    const log = (await unattributedEvents(payload)).slice(before);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      metadata: { method: "create" },
      target: { kind: "collection", slug: "posts" },
    });
    expect(log[0]?.target.docId).not.toBe(String(post.id));
  });

  it("a raw deleteMany without an id in a hook of a Payload update of that collection is unattributed", async () => {
    const { payload } = ctx;
    await payload.create({ collection: POSTS, data: { title: "Doomed" } as never });
    const doc = await payload.create({ collection: POSTS, data: { title: "Edited" } as never });
    const before = await unattributedCount();
    await payload.update({
      collection: POSTS,
      id: doc.id,
      data: { title: "Edited2" } as never,
      context: { [POST_HOOK_FLAGS.rawDeleteManyPostsTitled]: "Doomed" },
    });

    const log = (await unattributedEvents(payload)).slice(before);
    expect(log.map((event) => [event.metadata?.method, event.metadata?.where])).toEqual([
      ["deleteMany", ["title"]],
    ]);
  });

  it("a db call the adapter rejects (a where on an unknown field) records nothing and its error reaches the caller", async () => {
    const { payload } = ctx;
    const before = await unattributedCount();
    const req = await createLocalReq({}, payload);
    await initTransaction(req);
    try {
      await expect(
        payload.db.updateOne({
          collection: "posts",
          where: { noSuchField: { equals: "x" } },
          data: { title: "never" },
          req,
        })
      ).rejects.toBeInstanceOf(Error);
    } finally {
      await killTransaction(req);
    }
    expect(await unattributedCount()).toBe(before);
  });

  it("a raw write on a document right after a Payload update of it on the same req is unattributed", async () => {
    const { payload } = ctx;
    const post = await payload.create({ collection: POSTS, data: { title: "Covered" } as never });
    const req = await createLocalReq({}, payload);
    const before = await unattributedCount();
    await payload.update({
      collection: POSTS,
      id: post.id,
      data: { title: "By Payload" } as never,
      req,
    });
    await payload.db.updateOne({ collection: "posts", id: post.id, data: { title: "Raw" }, req });

    const log = (await unattributedEvents(payload)).slice(before);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      target: { kind: "collection", slug: "posts", docId: String(post.id) },
      changes: ["title"],
      metadata: { method: "updateOne" },
    });
  });

  it("a raw delete by the id of a document a Payload delete removed earlier on the same req is unattributed", async () => {
    const { payload } = ctx;
    const deleted = await payload.create({ collection: POSTS, data: { title: "Gone" } as never });
    const req = await createLocalReq({}, payload);
    const before = await unattributedCount();
    await payload.delete({ collection: POSTS, id: deleted.id, req });
    await payload.db.deleteOne({ collection: "posts", where: { id: { equals: deleted.id } }, req });

    const log = (await unattributedEvents(payload)).slice(before);
    expect(log.map((event) => [event.metadata?.method, event.target?.docId])).toEqual([
      ["deleteOne", String(deleted.id)],
    ]);
  });

  it("a raw global write after a Payload update of that global on the same req is unattributed", async () => {
    const { payload } = ctx;
    const req = await createLocalReq({}, payload);
    const before = await unattributedCount();
    await payload.updateGlobal({
      slug: "settings" as never,
      data: { siteName: "P" } as never,
      req,
    });
    await payload.db.updateGlobal({ slug: "settings", data: { siteName: "Raw" }, req });

    const log = (await unattributedEvents(payload)).slice(before);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ target: { kind: "global", slug: "settings" } });
  });

  it("a raw role change of a user after their login on the same req is unattributed", async () => {
    const { payload } = ctx;
    const user = await createUser(payload, "after-login@x.io");
    const req = await createLocalReq({}, payload);
    const before = await unattributedCount();
    await payload.login({
      collection: USERS,
      data: { email: "after-login@x.io", password: PASSWORD },
      req,
    });
    expect(await unattributedCount()).toBe(before);

    await payload.db.updateOne({ collection: "users", id: user.id, data: { role: "admin" }, req });

    const log = (await unattributedEvents(payload)).slice(before);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      target: { kind: "collection", slug: "users", docId: String(user.id) },
      changes: ["role"],
    });
  });

  it("a raw write after a Payload update that failed and rolled back on the same req is unattributed", async ({
    skip,
  }) => {
    const { payload } = ctx;
    if (!(await startsTransactions(payload))) skip();
    const post = await payload.create({ collection: POSTS, data: { title: "Fails" } as never });
    const req = await createLocalReq({}, payload);
    const before = await unattributedCount();
    await expect(
      payload.update({
        collection: POSTS,
        id: post.id,
        data: { title: "Never", author: "999999999" } as never,
        req,
      })
    ).rejects.toBeInstanceOf(Error);
    await payload.db.updateOne({ collection: "posts", id: post.id, data: { title: "Raw" }, req });

    const log = (await unattributedEvents(payload)).slice(before);
    expect(log.map((event) => event.target?.docId)).toEqual([String(post.id)]);
  });
});
