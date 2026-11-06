import { GRAPHQL_POST } from "@payloadcms/next/routes";
import type { CollectionConfig } from "payload";
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
const RESTRICTED_NOTES = "restricted-notes";

const restrictedNotes: CollectionConfig = {
  slug: RESTRICTED_NOTES,
  fields: [
    { name: "visible", type: "text" },
    { name: "hiddenNote", type: "text", hidden: true },
    { name: "unreadable", type: "text", access: { read: () => false } },
    {
      name: "details",
      type: "group",
      fields: [
        { name: "label", type: "text" },
        { name: "secret", type: "text", hidden: true },
        { name: "computed", type: "text", hidden: true, virtual: true },
      ],
    },
    {
      type: "tabs",
      tabs: [
        {
          name: "meta",
          fields: [
            { name: "summary", type: "text" },
            { name: "computed", type: "text", hidden: true, virtual: true },
          ],
        },
      ],
    },
  ],
};

let ctx: AuditTestPayload;
let signedInAdmin: Record<string, string>;
beforeAll(async () => {
  ctx = await bootAuditPayload({
    plugin: { roleFields: ["role", "roles", HIDDEN_ROLE_FIELD] },
    collections: [restrictedNotes],
  });
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

const noteCreatesOfThisTest = async () =>
  actionsAndChanges(
    await events(ctx.payload, {
      and: [
        { "target.slug": { equals: RESTRICTED_NOTES } },
        { occurredAt: { greater_than_equal: testStartedAt } },
      ],
    })
  );

const RESTRICTED_NOTE = {
  visible: "v",
  hiddenNote: "hidden-value",
  unreadable: "unreadable-value",
  details: { secret: "secret-value" },
};

const createNoteOverGraphql = async (data: Record<string, unknown>) => {
  const res = await GRAPHQL_POST(Promise.resolve(ctx.payload.config))(
    new Request("http://localhost:3000/api/graphql", {
      method: "POST",
      headers: { ...signedInAdmin, "content-type": "application/json" },
      body: JSON.stringify({
        query:
          "mutation ($data: mutationRestrictedNoteInput!) { createRestrictedNote(data: $data) { id } }",
        variables: { data },
      }),
    })
  );
  const body = (await res.json()) as { errors?: unknown[] };
  expect(body.errors).toBeUndefined();
};

describe("creates with fields the caller cannot read", () => {
  it("a REST create lists the hidden and read-restricted fields it wrote by name, never by value", async () => {
    const res = await rest(ctx.payload, "POST", `/${RESTRICTED_NOTES}`, {
      body: RESTRICTED_NOTE,
      headers: signedInAdmin,
    });
    expect(res.status).toBe(201);

    expect(await noteCreatesOfThisTest()).toEqual([
      ["doc.create", ["visible", "details", "hiddenNote", "unreadable"]],
    ]);
    const rows = await everyRowOfThisTestAsStored();
    for (const value of ["hidden-value", "unreadable-value", "secret-value"]) {
      expect(rows).not.toContain(value);
    }
  });

  it("a Local API create lists the hidden and read-restricted fields it wrote", async () => {
    await ctx.payload.create({
      collection: RESTRICTED_NOTES as never,
      data: RESTRICTED_NOTE as never,
    });

    expect(await noteCreatesOfThisTest()).toEqual([
      ["doc.create", ["visible", "unreadable", "details", "hiddenNote"]],
    ]);
  });

  it("a GraphQL create lists the read-restricted fields it wrote", async () => {
    await createNoteOverGraphql({ visible: "v", unreadable: "unreadable-value" });

    expect(await noteCreatesOfThisTest()).toEqual([["doc.create", ["visible", "unreadable"]]]);
  });

  it("a create without hidden or read-restricted values lists only what it wrote", async () => {
    await ctx.payload.create({
      collection: RESTRICTED_NOTES as never,
      data: { visible: "v" } as never,
    });

    expect(await noteCreatesOfThisTest()).toEqual([["doc.create", ["visible"]]]);
  });

  it("a create does not list a group or named tab whose only submitted value is virtual", async () => {
    await ctx.payload.create({
      collection: RESTRICTED_NOTES as never,
      data: { visible: "v", details: { computed: "c" }, meta: { computed: "c" } } as never,
    });

    expect(await noteCreatesOfThisTest()).toEqual([["doc.create", ["visible"]]]);
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
