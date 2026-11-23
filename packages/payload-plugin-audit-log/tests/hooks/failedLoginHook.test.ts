import { describe, expect, it, vi } from "vitest";
import { buildFailedLoginHook } from "../../src/hooks/failedLoginHook";
import { normalizeOptions } from "../../src/options";

const setup = (errorName: string, url = "https://example.com/api/users/login") => {
  const create = vi.fn().mockResolvedValue({});
  const error = Object.assign(new Error("x"), { name: errorName });
  const req = {
    context: {},
    user: null,
    payloadAPI: "REST",
    headers: new Headers(),
    url,
    data: { email: "who@example.com", password: "secret" },
    payload: { db: { create } },
  };
  return { create, args: { error, req, collection: { slug: "users" }, context: {} } };
};

describe("failed login hook", () => {
  const hook = buildFailedLoginHook(normalizeOptions());

  it("never throws when the failed login event cannot be built", async () => {
    const { create, args } = setup("AuthenticationError");
    const error = vi.fn();
    Object.assign(args.req.payload, { logger: { error } });
    Object.defineProperty(args.req, "data", {
      get() {
        throw new Error("unreadable body");
      },
    });
    await expect(hook(args as never)).resolves.toBeUndefined();
    expect(create).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("records invalid credentials without the password and outside the transaction", async () => {
    const { create, args } = setup("AuthenticationError");
    await hook(args as never);
    const call = create.mock.calls[0]?.[0];
    expect(call.req).toBeUndefined();
    expect(call.data).toMatchObject({
      action: "auth.login_failed",
      status: "failure",
      actor: { type: "anonymous", label: "who@example.com" },
      target: { kind: "auth", slug: "users" },
      metadata: { reason: "invalid_credentials" },
    });
    expect(JSON.stringify(call.data)).not.toContain("secret");
  });

  it("caps a submitted identifier at the longest valid email address", async () => {
    const { create, args } = setup("AuthenticationError");
    args.req.data = { email: "a".repeat(10_000), password: "secret" };
    await hook(args as never);
    expect(create.mock.calls[0]?.[0].data.actor.label).toBe("a".repeat(254));
  });

  it("records locked accounts", async () => {
    const { create, args } = setup("LockedAuth");
    await hook(args as never);
    expect(create.mock.calls[0]?.[0].data.metadata).toEqual({ reason: "locked" });
  });

  it("ignores other errors and other routes", async () => {
    const a = setup("ValidationError");
    await hook(a.args as never);
    expect(a.create).not.toHaveBeenCalled();
    const b = setup("AuthenticationError", "https://example.com/api/users/me");
    await hook(b.args as never);
    expect(b.create).not.toHaveBeenCalled();
  });
});

describe("failed login hook over GraphQL", () => {
  const hook = buildFailedLoginHook(normalizeOptions());
  const collections = {
    users: { config: { slug: "users", auth: {} } },
    "api-users": { config: { slug: "api-users", auth: {}, graphQL: { singularName: "Bot" } } },
    hidden: { config: { slug: "hidden", auth: {}, graphQL: false } },
    sso: { config: { slug: "sso", auth: { disableLocalStrategy: true } } },
    posts: { config: { slug: "posts" } },
  };
  const graphQLErrorWithoutCollection = (
    mutation: string,
    originalName: string,
    variables?: Record<string, unknown>
  ) => {
    const create = vi.fn().mockResolvedValue({});
    const error = Object.assign(new Error("x"), {
      name: "GraphQLError",
      path: [mutation],
      originalError: Object.assign(new Error("x"), { name: originalName }),
    });
    const req = {
      context: {},
      user: null,
      payloadAPI: "GraphQL",
      headers: new Headers(),
      url: "https://example.com/api/graphql",
      data: { query: "mutation { ... }", variables },
      payload: { db: { create }, collections },
    };
    return { create, args: { error, req, context: {}, graphqlResult: {} } };
  };

  it("maps login<Singular> to the auth collection and records the failure", async () => {
    const { create, args } = graphQLErrorWithoutCollection("loginUser", "AuthenticationError", {
      email: "who@example.com",
      password: "secret",
    });
    await hook(args as never);
    const call = create.mock.calls[0]?.[0];
    expect(call.req).toBeUndefined();
    expect(call.data).toMatchObject({
      action: "auth.login_failed",
      status: "failure",
      via: "graphql",
      actor: { type: "anonymous", label: "who@example.com" },
      target: { kind: "auth", slug: "users" },
      metadata: { reason: "invalid_credentials" },
    });
    expect(JSON.stringify(call.data)).not.toContain("secret");
  });

  it("uses the collection's graphQL singular name and records locks", async () => {
    const { create, args } = graphQLErrorWithoutCollection("loginBot", "LockedAuth");
    await hook(args as never);
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      target: { slug: "api-users" },
      metadata: { reason: "locked" },
    });
    expect(create.mock.calls[0]?.[0].data.actor.label).toBeUndefined();
  });

  it("ignores other mutations, other errors and collections without GraphQL login", async () => {
    for (const [field, name] of [
      ["meUser", "AuthenticationError"],
      ["loginUser", "ValidationError"],
      ["loginHidden", "AuthenticationError"],
      ["loginSso", "AuthenticationError"],
      ["loginPost", "AuthenticationError"],
    ] as const) {
      const { create, args } = graphQLErrorWithoutCollection(field, name);
      await hook(args as never);
      expect(create).not.toHaveBeenCalled();
    }
  });
});
