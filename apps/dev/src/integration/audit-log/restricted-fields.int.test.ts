import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  AUDIT_SLUG,
  bootAuditPayload,
  createUser,
  events,
  loginHeaders,
  rest,
  targetEvents,
  timestampAfterEverythingSoFar,
} from "./bootAuditPayload";
import type { AuditEventRow, AuditTestPayload } from "./bootAuditPayload";

const HIDDEN_ROLE_FIELD = "internalNote";

let ctx: AuditTestPayload;
let signedInAdmin: Record<string, string>;
beforeAll(async () => {
  ctx = await bootAuditPayload({ plugin: { roleFields: ["role", "roles", HIDDEN_ROLE_FIELD] } });
  await createUser(ctx.payload, "restricted-admin@x.io", { role: "admin" });
  signedInAdmin = await loginHeaders(ctx.payload, "restricted-admin@x.io");
});
afterAll(async () => {
  await ctx?.cleanup();
});

let testStartedAt = "";
beforeEach(async () => {
  testStartedAt = await timestampAfterEverythingSoFar();
});

const actionsAndChanges = (log: AuditEventRow[]) =>
  log.map((event) => [event.action, event.changes]);

const userEventsOfThisTest = async (id: unknown) =>
  actionsAndChanges(await targetEvents(ctx.payload, "users", id, testStartedAt));

const everyRowOfThisTestAsStored = async () => {
  const { docs } = await ctx.payload.find({
    collection: AUDIT_SLUG as never,
    where: { occurredAt: { greater_than_equal: testStartedAt } } as never,
    limit: 0,
    depth: 0,
  });
  return JSON.stringify(docs);
};

const createUserWithRestrictedFields = async (email: string) => {
  const user = await createUser(ctx.payload, email, {
    privateNote: "private-before",
    internalNote: "internal-before",
    profile: { headline: "h", taxId: "tax-before" },
  });
  testStartedAt = await timestampAfterEverythingSoFar();
  return user;
};

const patchUser = async (id: unknown, body: Record<string, unknown>) => {
  const res = await rest(ctx.payload, "PATCH", `/users/${id}`, { body, headers: signedInAdmin });
  expect(res.status).toBe(200);
};

const updateUser = (id: unknown, data: Record<string, unknown>) =>
  ctx.payload.update({ collection: "users" as never, id: id as string, data: data as never });

const storedUser = (id: unknown) =>
  ctx.payload.findByID({
    collection: "users" as never,
    id: id as string,
    showHiddenFields: true,
    overrideAccess: true,
  }) as Promise<Record<string, any>>;

describe("writes to fields the caller cannot read", () => {
  it("a REST write to a read-restricted field is logged by name, never by value", async () => {
    const user = await createUserWithRestrictedFields("read-restricted@x.io");
    await patchUser(user.id, { privateNote: "private-after" });

    expect((await storedUser(user.id)).privateNote).toBe("private-after");
    expect(await userEventsOfThisTest(user.id)).toEqual([["doc.update", ["privateNote"]]]);
    expect(await everyRowOfThisTestAsStored()).not.toContain("private-after");
  });

  it("a Local API write to a hidden field is logged by name, never by value", async () => {
    const user = await createUserWithRestrictedFields("hidden@x.io");
    await updateUser(user.id, { profile: { headline: "h", taxId: "tax-after" } });

    expect((await storedUser(user.id)).profile.taxId).toBe("tax-after");
    expect(await userEventsOfThisTest(user.id)).toEqual([["doc.update", ["profile.taxId"]]]);
    expect(await everyRowOfThisTestAsStored()).not.toContain("tax-after");
  });

  it("a change of a hidden role field is a role change", async () => {
    const user = await createUserWithRestrictedFields("hidden-role@x.io");
    await updateUser(user.id, { [HIDDEN_ROLE_FIELD]: "internal-after" });

    expect(await userEventsOfThisTest(user.id)).toEqual([
      ["doc.update", [HIDDEN_ROLE_FIELD]],
      ["user.role_changed", [HIDDEN_ROLE_FIELD]],
    ]);
  });

  it("no-op saves of hidden and read-restricted fields are not logged", async () => {
    const user = await createUserWithRestrictedFields("restricted-no-op@x.io");
    await patchUser(user.id, { privateNote: "private-before" });
    await patchUser(user.id, { name: undefined });
    await updateUser(user.id, {
      internalNote: "internal-before",
      profile: { headline: "h", taxId: "tax-before" },
    });
    await updateUser(user.id, {});

    expect(await userEventsOfThisTest(user.id)).toEqual([]);
  });
});

const SECRET_SETTINGS = "secret-settings";

const secretSettingsEventsOfThisTest = async () =>
  actionsAndChanges(
    await events(ctx.payload, {
      and: [
        { "target.slug": { equals: SECRET_SETTINGS } },
        { occurredAt: { greater_than_equal: testStartedAt } },
      ],
    })
  );

const storeSecretSettings = async () => {
  const stored = (await ctx.payload.updateGlobal({
    slug: SECRET_SETTINGS as never,
    data: {
      visible: "v",
      token: "token-before",
      links: [{ label: "one", secret: "secret-before" }],
    } as never,
  })) as unknown as { links: { id: string }[] };
  testStartedAt = await timestampAfterEverythingSoFar();
  return stored.links[0]?.id;
};

const postSecretSettings = async (body: Record<string, unknown>) => {
  const res = await rest(ctx.payload, "POST", `/globals/${SECRET_SETTINGS}`, {
    body,
    headers: signedInAdmin,
  });
  expect(res.status).toBe(200);
};

const storedSecretSettings = () =>
  ctx.payload.db.findGlobal<Record<string, any>>({ slug: SECRET_SETTINGS });

describe("writes to hidden fields of a global", () => {
  it("a REST write to hidden fields of a global is logged by path, never by value", async () => {
    const rowId = await storeSecretSettings();
    await postSecretSettings({
      token: "token-after",
      links: [{ id: rowId, label: "one", secret: "secret-after" }],
    });

    const stored = await storedSecretSettings();
    expect(stored.token).toBe("token-after");
    expect(stored.links[0].secret).toBe("secret-after");
    expect(await secretSettingsEventsOfThisTest()).toEqual([
      ["global.update", ["links.0.secret", "token"]],
    ]);
    const rows = await everyRowOfThisTestAsStored();
    expect(rows).not.toContain("token-after");
    expect(rows).not.toContain("secret-after");
  });

  it("no-op REST saves of hidden fields of a global are not logged", async () => {
    const rowId = await storeSecretSettings();
    await postSecretSettings({
      token: "token-before",
      links: [{ id: rowId, label: "one", secret: "secret-before" }],
    });
    await postSecretSettings({ visible: "v" });

    expect(await secretSettingsEventsOfThisTest()).toEqual([]);
  });
});
