import type { CollectionConfig, Endpoint, PayloadRequest, SanitizedConfig } from "payload";
import { beforeAll, describe, expect, it, vi } from "vitest";

const { overrideAuth, overrideAuthCalled } = vi.hoisted(() => {
  const called = new Error("overrideAuth was called");
  return {
    overrideAuth: vi.fn(async () => {
      throw called;
    }),
    overrideAuthCalled: called,
  };
});

vi.mock("@/lib/plugins/mcp/overrideAuth", () => ({ overrideAuth }));

const AUDIT_SLUG = "audit-events";
const MCP_API_KEYS_SLUG = "payload-mcp-api-keys";

type HookArgs = Record<string, unknown>;
type Hook = (args: HookArgs) => unknown;

let config: SanitizedConfig;

beforeAll(async () => {
  vi.stubEnv("PAYLOAD_SECRET", "audit-config-test-secret");
  vi.stubEnv("DATABASE_URL", "postgres://audit-config-test@localhost:1/never-connected");
  config = await (await import("@payload-config")).default;
});

const collectionOf = (slug: string): CollectionConfig => {
  const collection = config.collections.find((candidate) => candidate.slug === slug);
  if (!collection) throw new Error(`collection ${slug} is not configured`);
  return collection;
};

const requestOf = (user: unknown) => {
  const create = vi.fn(async () => ({}));
  const req = {
    context: {},
    headers: new Headers(),
    payload: { db: { create }, logger: { error: vi.fn(), warn: vi.fn() } },
    payloadAPI: "local",
    query: {},
    user,
  };
  return { create, req: req as unknown as PayloadRequest };
};

const readAccessOf = (user: unknown) => {
  const read = collectionOf(AUDIT_SLUG).access?.read as Hook;
  return read({ req: requestOf(user).req });
};

describe("apps/cms audit log config", () => {
  it("adds the audit collection", () => {
    expect(collectionOf(AUDIT_SLUG)).toBeDefined();
  });

  it("lets only admins read the audit log", async () => {
    expect(await readAccessOf({ id: 1, role: "editor" })).toBe(false);
    expect(await readAccessOf({ id: 2, role: "admin" })).toBe(true);
    expect(await readAccessOf(null)).toBe(false);
  });

  it("audits the MCP API keys collection as documents, so the audit plugin runs after the MCP plugin", async () => {
    const { create, req } = requestOf({ collection: "users", email: "admin@example.com", id: 2 });
    const doc = { id: 5, label: "Claude" };
    for (const hook of collectionOf(MCP_API_KEYS_SLUG).hooks?.afterChange ?? []) {
      await (hook as Hook)({
        collection: collectionOf(MCP_API_KEYS_SLUG),
        context: {},
        data: {},
        doc,
        operation: "create",
        previousDoc: {},
        req,
      });
    }
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: AUDIT_SLUG,
        data: expect.objectContaining({
          action: "doc.create",
          target: expect.objectContaining({ docId: "5", slug: MCP_API_KEYS_SLUG }),
        }),
      })
    );
  });

  it("authenticates MCP requests with the exported overrideAuth", async () => {
    const mcpEndpoint = config.endpoints.find(
      (endpoint: Endpoint) => endpoint.path === "/mcp" && endpoint.method === "post"
    );
    const req = { context: {}, headers: new Headers() } as unknown as PayloadRequest;

    await expect(mcpEndpoint?.handler(req)).rejects.toBe(overrideAuthCalled);
    expect(overrideAuth).toHaveBeenCalledWith(req, expect.any(Function));
  });
});
