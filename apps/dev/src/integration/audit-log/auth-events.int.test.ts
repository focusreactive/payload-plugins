import { createLocalReq } from "payload";
import { addSessionToUser } from "payload/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  authCookie,
  bootAuditPayload,
  createUser,
  eventsWithAction,
  MAX_LOGIN_ATTEMPTS,
  PASSWORD,
  rest,
  SERVICE_KEYS_SLUG,
  targetEvents,
  timestampAfterEverythingSoFar,
  unattributedEvents,
} from "./bootAuditPayload";
import type { AuditEventRow, AuditTestPayload } from "./bootAuditPayload";

let ctx: AuditTestPayload;
beforeAll(async () => {
  ctx = await bootAuditPayload();
});
afterAll(async () => {
  await ctx?.cleanup();
});

let testStartedAt = "";
beforeEach(async () => {
  testStartedAt = await timestampAfterEverythingSoFar();
});

const USERS = "users" as never;

const ofThisTest = (log: AuditEventRow[]) =>
  log.filter((event) => String(event.occurredAt) >= testStartedAt);

const actionsOf = (log: AuditEventRow[]) => log.map((event) => event.action);

const loginOverRest = (email: string, password = PASSWORD) =>
  rest(ctx.payload, "POST", "/users/login", { body: { email, password } });

const unattributedOfThisTest = async () => ofThisTest(await unattributedEvents(ctx.payload));

type StoredUser = { id: number | string } & Record<string, unknown>;

const readStoredUser = (id: unknown) =>
  ctx.payload.db.findOne<StoredUser>({
    collection: "users",
    where: { id: { equals: id } },
  });

describe("auth events in real flows", () => {
  it("login, refresh and logout over REST record login and logout of that user and nothing unattributed", async () => {
    const user = await createUser(ctx.payload, "flow@x.io");
    const login = await loginOverRest("flow@x.io");
    expect(login.status).toBe(200);
    const cookie = authCookie(login);
    const refresh = await rest(ctx.payload, "POST", "/users/refresh-token", {
      headers: { cookie },
    });
    expect(refresh.status).toBe(200);
    const logout = await rest(ctx.payload, "POST", "/users/logout", { headers: { cookie } });
    expect(logout.status).toBe(200);

    const log = ofThisTest(await targetEvents(ctx.payload, "users", user.id));
    expect(actionsOf(log)).toEqual(["doc.create", "auth.login", "auth.logout"]);
    expect(log[2]).toMatchObject({
      actor: { type: "user", docId: String(user.id), label: "flow@x.io" },
      target: { kind: "auth", slug: "users", docId: String(user.id) },
    });
    expect(await unattributedOfThisTest()).toEqual([]);
  });

  it("forgot password and reset password are recorded, the reset by the user who reset", async () => {
    const user = await createUser(ctx.payload, "reset@x.io");
    const token = await ctx.payload.forgotPassword({
      collection: USERS,
      data: { email: "reset@x.io" } as never,
      disableEmail: true,
    });
    await ctx.payload.resetPassword({
      collection: USERS,
      data: { token: String(token), password: "a-new-password" },
      overrideAccess: true,
    });

    const [requested] = ofThisTest(
      await eventsWithAction(ctx.payload, "auth.password_reset_requested")
    );
    expect(requested?.target).toMatchObject({ kind: "auth", slug: "users", label: "reset@x.io" });
    const [reset] = ofThisTest(await eventsWithAction(ctx.payload, "auth.password_reset"));
    expect(reset).toMatchObject({
      actor: { type: "user", docId: String(user.id), label: "reset@x.io" },
      target: { kind: "auth", slug: "users", docId: String(user.id) },
    });
    expect(JSON.stringify([requested, reset])).not.toContain(String(token));
    expect(await unattributedOfThisTest()).toEqual([]);
  });

  it("the right password on a locked account is a failed login with reason locked", async () => {
    await createUser(ctx.payload, "locked@x.io");
    for (let attempt = 0; attempt < MAX_LOGIN_ATTEMPTS; attempt += 1) {
      expect((await loginOverRest("locked@x.io", "wrong-password")).status).toBe(401);
    }
    expect((await loginOverRest("locked@x.io")).status).toBe(401);

    const failures = ofThisTest(await eventsWithAction(ctx.payload, "auth.login_failed"));
    expect(failures.map((event) => event.metadata?.reason)).toEqual([
      ...Array.from({ length: MAX_LOGIN_ATTEMPTS }, () => "invalid_credentials"),
      "locked",
    ]);
    expect(failures.at(-1)?.actor).toMatchObject({ type: "anonymous", label: "locked@x.io" });
    expect(await unattributedOfThisTest()).toEqual([]);
  });

  it("an SSO route that adds a session to a user it read through the Local API is not unattributed", async () => {
    const signInThroughSso = async (email: string) => {
      const {
        docs: [user],
      } = await ctx.payload.find({ collection: USERS, where: { email: { equals: email } } });
      await addSessionToUser({
        collectionConfig: ctx.payload.collections.users.config,
        payload: ctx.payload,
        req: await createLocalReq({}, ctx.payload),
        user: { ...(user as object), collection: "users" } as never,
      });
    };
    await createUser(ctx.payload, "sso@x.io");
    await createUser(ctx.payload, "sso-profile@x.io", {
      profile: { headline: "h", taxId: "tax-1" },
    });

    await signInThroughSso("sso@x.io");
    await signInThroughSso("sso-profile@x.io");

    expect(await unattributedOfThisTest()).toEqual([]);
  });

  it("an SSO route that adds a session to a user it read in a non-default locale is not unattributed", async () => {
    const user = await createUser(ctx.payload, "sso-de@x.io", { nickname: "english" });
    await ctx.payload.update({
      collection: USERS,
      id: user.id,
      locale: "de",
      data: { nickname: "deutsch" } as never,
    });
    testStartedAt = await timestampAfterEverythingSoFar();
    const readInGerman = await ctx.payload.findByID({
      collection: USERS,
      id: user.id,
      locale: "de",
    });
    expect((readInGerman as { nickname?: unknown }).nickname).toBe("deutsch");

    await addSessionToUser({
      collectionConfig: ctx.payload.collections.users.config,
      payload: ctx.payload,
      req: await createLocalReq({ locale: "de" }, ctx.payload),
      user: { ...(readInGerman as object), collection: "users" } as never,
    });

    expect(await unattributedOfThisTest()).toEqual([]);
    const storedInGerman = await ctx.payload.findByID({
      collection: USERS,
      id: user.id,
      locale: "de",
    });
    const storedInEnglish = await ctx.payload.findByID({
      collection: USERS,
      id: user.id,
      locale: "en",
    });
    expect((storedInGerman as { nickname?: unknown }).nickname).toBe("deutsch");
    expect((storedInEnglish as { nickname?: unknown }).nickname).toBe("english");
  });

  it("a raw write of a localized user field in a non-default locale is unattributed and names that field", async () => {
    const user = await createUser(ctx.payload, "raw-de@x.io", { nickname: "english" });
    await ctx.payload.update({
      collection: USERS,
      id: user.id,
      locale: "de",
      data: { nickname: "deutsch" } as never,
    });
    testStartedAt = await timestampAfterEverythingSoFar();
    const readInGerman = await ctx.payload.findByID({
      collection: USERS,
      id: user.id,
      locale: "de",
    });

    await ctx.payload.db.updateOne({
      collection: "users",
      id: user.id,
      data: { ...(readInGerman as object), nickname: "geändert", sessions: [] },
      req: await createLocalReq({ locale: "de" }, ctx.payload),
    });

    const [event] = await unattributedOfThisTest();
    expect(event?.changes).toEqual(["nickname"]);
  });
});

type BadgesUser = { id: string | number; badges: { id: string }[] };

const createUserWithGermanBadge = async (email: string) => {
  const user = (await createUser(ctx.payload, email, {
    badges: [{ blockType: "badge", label: "one", caption: "english" }],
  })) as unknown as BadgesUser;
  const rowId = user.badges[0]?.id;
  await ctx.payload.update({
    collection: USERS,
    id: user.id,
    locale: "de",
    data: {
      badges: [{ id: rowId, blockType: "badge", label: "one", caption: "deutsch" }],
    } as never,
  });
  testStartedAt = await timestampAfterEverythingSoFar();
  const readInGerman = (await ctx.payload.findByID({
    collection: USERS,
    id: user.id,
    locale: "de",
  })) as unknown as BadgesUser & Record<string, unknown>;
  return { user, readInGerman };
};

describe("raw writes to a user with localized fields inside blocks", () => {
  it("an SSO route that adds a session to a user it read in a non-default locale is not unattributed", async () => {
    const { readInGerman } = await createUserWithGermanBadge("sso-badges@x.io");
    expect(readInGerman.badges[0]).toMatchObject({ caption: "deutsch" });

    await addSessionToUser({
      collectionConfig: ctx.payload.collections.users.config,
      payload: ctx.payload,
      req: await createLocalReq({ locale: "de" }, ctx.payload),
      user: { ...readInGerman, collection: "users" } as never,
    });

    expect(await unattributedOfThisTest()).toEqual([]);
  });

  it("a raw write of a localized block field in a non-default locale is unattributed and names that field", async () => {
    const { user, readInGerman } = await createUserWithGermanBadge("raw-badges@x.io");

    await ctx.payload.db.updateOne({
      collection: "users",
      id: user.id,
      data: {
        ...readInGerman,
        badges: [{ ...readInGerman.badges[0], caption: "geändert" }],
        sessions: [],
      },
      req: await createLocalReq({ locale: "de" }, ctx.payload),
    });

    const [event] = await unattributedOfThisTest();
    expect(event?.changes).toEqual(["badges.0.caption"]);
  });
});

describe("raw writes to a user", () => {
  it("writing the whole stored user back with a new role is unattributed and names only the role", async () => {
    const user = await createUser(ctx.payload, "raw-role@x.io");
    const stored = await readStoredUser(user.id);
    expect(stored).toHaveProperty("hash");

    await ctx.payload.db.updateOne({
      collection: "users",
      id: user.id,
      data: { ...stored, role: "admin" },
    });

    const [event] = await unattributedOfThisTest();
    expect(event).toMatchObject({
      target: { kind: "collection", slug: "users", docId: String(user.id) },
      changes: ["role"],
      metadata: { method: "updateOne" },
    });
    expect((await readStoredUser(user.id))?.role).toBe("admin");
  });

  it("writing a user read through the Local API back with a new role is unattributed and includes the role", async () => {
    const user = await createUser(ctx.payload, "raw-role-local@x.io");
    await ctx.payload.db.updateOne({
      collection: "users",
      id: user.id,
      data: { ...(user as object), role: "admin" },
    });

    const [event] = await unattributedOfThisTest();
    expect(event?.changes).toContain("role");
  });

  it("writing only login bookkeeping is not unattributed", async () => {
    const user = await createUser(ctx.payload, "bookkeeping@x.io");
    await ctx.payload.db.updateOne({
      collection: "users",
      id: user.id,
      data: { loginAttempts: 1, lockUntil: null },
    });

    expect(await unattributedOfThisTest()).toEqual([]);
  });
});

describe("API keys", () => {
  it("creating and deleting a key in an API key collection is apikey.created and apikey.revoked", async () => {
    const key = await ctx.payload.create({
      collection: SERVICE_KEYS_SLUG as never,
      data: { label: "CI", enableAPIKey: true, apiKey: "service-key-0001" } as never,
    });
    await ctx.payload.delete({ collection: SERVICE_KEYS_SLUG as never, id: key.id });

    const log = ofThisTest(await targetEvents(ctx.payload, SERVICE_KEYS_SLUG, key.id));
    expect(actionsOf(log)).toEqual(["apikey.created", "apikey.revoked"]);
    expect(log[0]?.target.label).toBe("CI");
    expect(JSON.stringify(log)).not.toContain("service-key-0001");
  });

  it("switching a key off is apikey.revoked", async () => {
    const key = await ctx.payload.create({
      collection: SERVICE_KEYS_SLUG as never,
      data: { label: "Deploy", enableAPIKey: true, apiKey: "service-key-0002" } as never,
    });
    await ctx.payload.update({
      collection: SERVICE_KEYS_SLUG as never,
      id: key.id,
      data: { enableAPIKey: false } as never,
    });

    const log = ofThisTest(await targetEvents(ctx.payload, SERVICE_KEYS_SLUG, key.id));
    expect(actionsOf(log)).toEqual(["apikey.created", "apikey.revoked"]);
    expect(log[1]?.changes).toContain("enableAPIKey");
  });
});
