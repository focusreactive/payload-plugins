import { withAuditActor } from "@focus-reactive/payload-plugin-audit-log";
import { GRAPHQL_POST } from "@payloadcms/next/routes";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  bootAuditPayload,
  createUser,
  eventsWithAction,
  loginHeaders,
  rest,
  targetEvents,
} from "./bootAuditPayload";
import type { AuditTestPayload } from "./bootAuditPayload";

let ctx: AuditTestPayload;
beforeAll(async () => {
  ctx = await bootAuditPayload();
});
afterAll(async () => {
  await ctx?.cleanup();
});

const createPost = (title: string, options: Record<string, unknown> = {}) =>
  ctx.payload.create({ collection: "posts" as never, data: { title } as never, ...options });

const firstEventOfPost = async (id: unknown) => {
  const [event] = await targetEvents(ctx.payload, "posts", id);
  return event;
};

const createPostOverRest = async (title: string, headers: Record<string, string>) => {
  const res = await rest(ctx.payload, "POST", "/posts", { body: { title }, headers });
  const { doc } = (await res.json()) as { doc: { id: string | number } };
  return { status: res.status, doc };
};

const graphqlLogin = (email: string, password: string) =>
  GRAPHQL_POST(Promise.resolve(ctx.payload.config))(
    new Request("http://localhost:3000/api/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query:
          "mutation ($email: String!, $password: String!) { loginUser(email: $email, password: $password) { token } }",
        variables: { email, password },
      }),
    })
  );

describe("actors", () => {
  it("local API without a user is system and overrideAccess is recorded", async () => {
    const doc = await createPost("S");
    const event = await firstEventOfPost(doc.id);
    expect(event?.actor).toMatchObject({ type: "system", source: "inferred" });
    expect(event?.via).toBe("local");
    expect(event?.overrideAccess).toBe(true);
  });

  it("withAuditActor labels the Local API calls of a script", async () => {
    const doc = await withAuditActor({ type: "system", label: "seed.ts" }, () =>
      createPost("Seeded")
    );
    const event = await firstEventOfPost(doc.id);
    expect(event?.actor).toMatchObject({ type: "system", label: "seed.ts", source: "als" });
  });

  it("an agent acting for a user", async () => {
    const owner = await createUser(ctx.payload, "owner@example.com");
    const doc = await createPost("By agent", {
      user: owner,
      context: {
        auditActor: {
          type: "agent",
          agent: {
            name: "content-agent",
            model: "claude",
            tool: "createPost",
            keyId: "key-42",
          },
        },
      },
    });
    const event = await firstEventOfPost(doc.id);
    expect(event?.actor).toMatchObject({ type: "agent", source: "context" });
    expect(event?.onBehalfOf).toMatchObject({
      docId: String(owner.id),
      label: "owner@example.com",
    });
    expect(event?.agent).toEqual({
      name: "content-agent",
      model: "claude",
      tool: "createPost",
      keyId: "key-42",
    });
  });

  it("a user passed to the local API is the actor", async () => {
    const user = await createUser(ctx.payload, "ed@example.com");
    const doc = await createPost("U", { user, overrideAccess: false });
    const event = await firstEventOfPost(doc.id);
    expect(event?.actor).toMatchObject({
      type: "user",
      docId: String(user.id),
      collection: "users",
    });
    expect(event?.overrideAccess).toBe(false);
  });

  it("REST with an API key is an api_key actor via rest", async () => {
    const key = await ctx.payload.create({
      collection: "integrations" as never,
      data: { name: "CI", enableAPIKey: true, apiKey: "test-api-key-0001" } as never,
    });
    const { status, doc } = await createPostOverRest("Via key", {
      authorization: "integrations API-Key test-api-key-0001",
    });
    expect(status).toBe(201);
    const event = await firstEventOfPost(doc.id);
    expect(event?.actor).toMatchObject({
      type: "api_key",
      docId: String(key.id),
      collection: "integrations",
      source: "auth",
    });
    expect(event?.via).toBe("rest");
    expect(event?.overrideAccess).toBe(false);
  });

  it("REST from the admin panel is via admin", async () => {
    const { doc } = await createPostOverRest("Via admin", {
      ...(await loginHeaders(ctx.payload, "ed@example.com")),
      referer: "http://localhost:3000/admin/collections/posts/create",
    });
    const event = await firstEventOfPost(doc.id);
    expect(event?.actor).toMatchObject({ type: "user", label: "ed@example.com", source: "auth" });
    expect(event?.via).toBe("admin");
  });
});

describe("failed logins over GraphQL", () => {
  it("are recorded with the auth collection, the reason and the submitted email", async () => {
    await createUser(ctx.payload, "gql@example.com");
    const failedBefore = await eventsWithAction(ctx.payload, "auth.login_failed");

    const res = await graphqlLogin("gql@example.com", "wrong-password-1");
    const body = (await res.json()) as { errors?: { extensions?: { name?: string } }[] };
    expect(body.errors?.[0]?.extensions?.name).toBe("AuthenticationError");

    const failedAfter = await eventsWithAction(ctx.payload, "auth.login_failed");
    expect(failedAfter).toHaveLength(failedBefore.length + 1);
    expect(failedAfter.at(-1)).toMatchObject({
      status: "failure",
      via: "graphql",
      actor: { type: "anonymous", label: "gql@example.com" },
      target: { kind: "auth", slug: "users" },
      metadata: { reason: "invalid_credentials" },
    });
    expect(JSON.stringify(failedAfter.at(-1))).not.toContain("wrong-password-1");
  });
});
