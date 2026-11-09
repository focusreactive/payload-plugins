import type { CollectionBeforeChangeHook, Config, Plugin } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootAuditPayload, createUser, loginHeaders, rest, targetEvents } from "./bootAuditPayload";
import type { AuditTestPayload } from "./bootAuditPayload";

const COLLECTIONS_WITH_REPLACED_DATA = new Set(["users", "posts"]);

const returnACopyOfData: CollectionBeforeChangeHook = ({ data }) => ({ ...data });

const replaceDataAfterTheAuditPlugin: Plugin = (config: Config): Config => ({
  ...config,
  collections: config.collections?.map((collection) =>
    COLLECTIONS_WITH_REPLACED_DATA.has(collection.slug)
      ? {
          ...collection,
          hooks: {
            ...collection.hooks,
            beforeChange: [...(collection.hooks?.beforeChange ?? []), returnACopyOfData],
          },
        }
      : collection
  ),
});

let ctx: AuditTestPayload;
beforeAll(async () => {
  ctx = await bootAuditPayload({ pluginsAfterAudit: [replaceDataAfterTheAuditPlugin] });
});
afterAll(async () => {
  await ctx?.cleanup();
});

describe("a beforeChange hook added after the audit plugin returns a new data object", () => {
  it("the audit hook runs before the replacing hook", () => {
    const hooks = ctx.payload.collections["users" as never].config.hooks.beforeChange;
    expect(hooks.at(-1)).toBe(returnACopyOfData);
  });

  it("a password change over REST is still doc.update with password among the changes", async () => {
    const user = await createUser(ctx.payload, "copy-password@x.io");
    const headers = await loginHeaders(ctx.payload, "copy-password@x.io");
    const res = await rest(ctx.payload, "PATCH", `/users/${user.id}`, {
      headers,
      body: { password: "a-new-password-456" },
    });
    expect(res.status).toBe(200);

    const updates = (await targetEvents(ctx.payload, "users", user.id)).filter(
      (event) => event.action === "doc.update"
    );
    expect(updates).toHaveLength(1);
    expect(updates[0]?.changes).toContain("password");
    expect(JSON.stringify(updates)).not.toContain("a-new-password-456");
  });

  it("a duplicate is doc.create of the copy", async () => {
    const original = await ctx.payload.create({
      collection: "posts" as never,
      data: { title: "Original" } as never,
    });
    const copy = await ctx.payload.duplicate({ collection: "posts" as never, id: original.id });

    const [created] = await targetEvents(ctx.payload, "posts", copy.id);
    expect(created).toMatchObject({ action: "doc.create", target: { label: "Original" } });
  });
});
