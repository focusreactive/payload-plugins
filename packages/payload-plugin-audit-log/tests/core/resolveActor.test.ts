import { describe, expect, it } from "vitest";
import { resolveActor } from "../../src/core/resolveActor";

const headers = (referer?: string) => new Headers(referer ? { referer } : {});

describe("resolveActor", () => {
  it("explicit context actor wins and agents act on behalf of req.user", () => {
    const r = resolveActor(
      {
        context: { auditActor: { type: "agent", agent: { keyId: "k1", model: "m" } } },
        user: { id: 5, collection: "users", email: "a@x.io" },
        payloadAPI: "MCP",
        headers: headers(),
      },
      undefined
    );
    expect(r.actor).toEqual({ type: "agent", source: "context" });
    expect(r.onBehalfOf).toEqual({ collection: "users", docId: "5", label: "a@x.io" });
    expect(r.agent).toEqual({ keyId: "k1", model: "m" });
    expect(r.via).toBe("mcp");
  });

  it("uses the ALS scope when context is empty", () => {
    const r = resolveActor(
      { context: {}, user: null, payloadAPI: "local", headers: headers() },
      { type: "system", label: "importer" }
    );
    expect(r.actor).toEqual({ type: "system", label: "importer", source: "als" });
    expect(r.via).toBe("local");
  });

  it("detects MCP agents without explicit metadata", () => {
    const r = resolveActor(
      {
        context: {},
        user: { id: 1, collection: "users", email: "o@x.io", _strategy: "mcp-api-key" },
        payloadAPI: "MCP",
        headers: headers(),
      },
      undefined
    );
    expect(r.actor.type).toBe("agent");
    expect(r.actor.source).toBe("auth");
    expect(r.onBehalfOf?.docId).toBe("1");
    expect(r.via).toBe("mcp");
  });

  it("detects API key users", () => {
    const r = resolveActor(
      {
        context: {},
        user: { id: "k9", collection: "integrations", name: "CI", _strategy: "api-key" },
        payloadAPI: "REST",
        headers: headers(),
      },
      undefined
    );
    expect(r.actor).toEqual({
      type: "api_key",
      docId: "k9",
      collection: "integrations",
      label: "CI",
      source: "auth",
    });
    expect(r.via).toBe("rest");
  });

  it("detects admin users by referer", () => {
    const r = resolveActor(
      {
        context: {},
        user: { id: 2, collection: "users", email: "e@x.io", _strategy: "local-jwt" },
        payloadAPI: "REST",
        headers: headers("https://site.io/admin/collections/posts/1"),
      },
      undefined
    );
    expect(r.actor).toEqual({
      type: "user",
      docId: "2",
      collection: "users",
      label: "e@x.io",
      source: "auth",
    });
    expect(r.via).toBe("admin");
  });

  it("local API without a user is system, HTTP without a user is anonymous", () => {
    expect(
      resolveActor({ context: {}, user: null, payloadAPI: "local", headers: headers() }, undefined)
        .actor
    ).toEqual({ type: "system", source: "inferred" });
    expect(
      resolveActor({ context: {}, user: null, payloadAPI: "REST", headers: headers() }, undefined)
        .actor
    ).toEqual({ type: "anonymous", source: "inferred" });
  });

  it("fills onBehalfOf from req.user for any explicit actor type", () => {
    const user = { id: 5, collection: "users", email: "a@x.io" };
    const fromContext = resolveActor(
      { context: { auditActor: { type: "agent" } }, user, payloadAPI: "local", headers: headers() },
      undefined
    );
    expect(fromContext.onBehalfOf).toEqual({ collection: "users", docId: "5", label: "a@x.io" });
    const fromScope = resolveActor(
      { context: {}, user, payloadAPI: "local", headers: headers() },
      { type: "system" }
    );
    expect(fromScope.onBehalfOf).toEqual({ collection: "users", docId: "5", label: "a@x.io" });
    const given = resolveActor(
      { context: {}, user, payloadAPI: "local", headers: headers() },
      { type: "agent", onBehalfOf: { docId: "x" } }
    );
    expect(given.onBehalfOf).toEqual({ docId: "x" });
  });

  it("ignores an explicit actor with an unknown type", () => {
    const user = { id: 2, collection: "users", email: "e@x.io" };
    const fromContext = resolveActor(
      { context: { auditActor: { type: "robot" } }, user, payloadAPI: "REST", headers: headers() },
      undefined
    );
    expect(fromContext.actor).toMatchObject({ type: "user", docId: "2", source: "auth" });
    const fromScope = resolveActor(
      { context: {}, user: null, payloadAPI: "local", headers: headers() },
      { type: "bogus" } as never
    );
    expect(fromScope.actor).toEqual({ type: "system", source: "inferred" });
  });

  it("matches the admin route by URL path, honouring a custom admin route", () => {
    const user = { id: 2, collection: "users", email: "e@x.io" };
    const via = (referer: string, admin?: string) =>
      resolveActor(
        {
          context: {},
          user,
          payloadAPI: "REST",
          headers: headers(referer),
          payload: admin ? { config: { routes: { admin } } } : undefined,
        },
        undefined
      ).via;
    expect(via("https://site.io/administration/x")).toBe("rest");
    expect(via("https://site.io/blog/admin")).toBe("rest");
    expect(via("https://site.io/admin")).toBe("admin");
    expect(via("https://site.io/cms/collections/posts", "/cms")).toBe("admin");
    expect(via("https://site.io/admin/collections/posts", "/cms")).toBe("rest");
    expect(via("not a url")).toBe("rest");
  });

  it("stores the explicit actor docId as a string", () => {
    const req = { context: {}, payloadAPI: "local", headers: headers() };
    expect(resolveActor(req, { type: "agent", docId: 5 }).actor).toEqual({
      type: "agent",
      docId: "5",
      source: "als",
    });
  });
});
