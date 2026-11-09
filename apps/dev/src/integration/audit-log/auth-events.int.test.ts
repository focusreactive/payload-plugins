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

describe("auth events in real flows", () => {
  it("login, refresh and logout over REST record login and logout of that user", async () => {
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
  });

  it("an SSO route that adds a session to a user through the database adapter records nothing", async () => {
    await createUser(ctx.payload, "sso@x.io");
    const {
      docs: [user],
    } = await ctx.payload.find({ collection: USERS, where: { email: { equals: "sso@x.io" } } });
    testStartedAt = await timestampAfterEverythingSoFar();

    await addSessionToUser({
      collectionConfig: ctx.payload.collections.users.config,
      payload: ctx.payload,
      req: await createLocalReq({}, ctx.payload),
      user: { ...(user as object), collection: "users" } as never,
    });

    expect(ofThisTest(await targetEvents(ctx.payload, "users", user?.id))).toEqual([]);
  });
});

describe("the client of the request", () => {
  it("stores the client IP and User-Agent of a REST login and of a failed one", async () => {
    await createUser(ctx.payload, "client@x.io");
    const headers = {
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
      "user-agent": "Mozilla/5.0 (audit test)",
    };
    const body = { email: "client@x.io", password: PASSWORD };
    expect((await rest(ctx.payload, "POST", "/users/login", { body, headers })).status).toBe(200);
    expect(
      (
        await rest(ctx.payload, "POST", "/users/login", {
          body: { ...body, password: "wrong-password" },
          headers: { "x-real-ip": "198.51.100.4" },
        })
      ).status
    ).toBe(401);

    const [login] = ofThisTest(await eventsWithAction(ctx.payload, "auth.login"));
    expect(login).toMatchObject({ ip: "203.0.113.7", userAgent: "Mozilla/5.0 (audit test)" });
    const [failed] = ofThisTest(await eventsWithAction(ctx.payload, "auth.login_failed"));
    expect(failed).toMatchObject({ ip: "198.51.100.4", userAgent: null });
  });

  it("stores null for both on a Local API call without headers", async () => {
    const user = await createUser(ctx.payload, "local-client@x.io");
    const [created] = ofThisTest(await targetEvents(ctx.payload, "users", user.id));
    expect(created).toMatchObject({ action: "doc.create", ip: null, userAgent: null });
  });
});

describe("API keys", () => {
  it("creating and deleting a key in an API key collection is doc.create and doc.delete of that collection", async () => {
    const key = await ctx.payload.create({
      collection: SERVICE_KEYS_SLUG as never,
      data: { label: "CI", enableAPIKey: true, apiKey: "service-key-0001" } as never,
    });
    await ctx.payload.delete({ collection: SERVICE_KEYS_SLUG as never, id: key.id });

    const log = ofThisTest(await targetEvents(ctx.payload, SERVICE_KEYS_SLUG, key.id));
    expect(actionsOf(log)).toEqual(["doc.create", "doc.delete"]);
    expect(log[0]?.target.label).toBe("CI");
    expect(JSON.stringify(log)).not.toContain("service-key-0001");
  });

  it("switching a key off is doc.update of enableAPIKey", async () => {
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
    expect(actionsOf(log)).toEqual(["doc.create", "doc.update"]);
    expect(log[1]?.changes).toContain("enableAPIKey");
  });
});
