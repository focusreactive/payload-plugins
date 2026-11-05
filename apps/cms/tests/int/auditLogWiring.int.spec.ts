import type { PayloadRequest } from "payload";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/(payload)/api/auth/oidc/callback/route";
import { logOidcLogin } from "@/lib/auth/oidc/logOidcLogin";
import { signInOidcUser } from "@/lib/auth/oidc/signInOidcUser";
import { overrideAuth } from "@/lib/plugins/mcp/overrideAuth";
import { uploadImage } from "@/lib/plugins/mcp/tools/uploadImage";

const { findOrCreateAdminUser, getPayloadClient, logAuditEvent, scopedActors, steps } = vi.hoisted(
  () => ({
    findOrCreateAdminUser: vi.fn(),
    getPayloadClient: vi.fn(),
    logAuditEvent: vi.fn(),
    scopedActors: [] as unknown[],
    steps: [] as string[],
  })
);

vi.mock("@focus-reactive/payload-plugin-audit-log", () => ({
  CTX_ACTOR: "auditActor",
  logAuditEvent,
  withAuditActor: async (actor: unknown, run: () => unknown) => {
    scopedActors.push(actor);
    try {
      return await run();
    } finally {
      scopedActors.pop();
    }
  },
}));

vi.mock("@/lib/auth/utils/user", () => ({ findOrCreateAdminUser }));

vi.mock("@/dal", () => ({ getPayloadClient }));

vi.mock("@/lib/plugins/mcp/tools/uploadImage/resolveSource", () => ({
  resolveSource: vi.fn(async () => ({
    buffer: Buffer.from("png"),
    filename: "cat.png",
    mimeType: "image/png",
  })),
}));

const apiKey = {
  id: 12,
  label: "Claude",
  user: { email: "editor@x.io", id: 3 },
};

const mcpRequest = (url: string) =>
  ({
    context: { existing: true },
    headers: new Headers(),
    url,
  }) as unknown as PayloadRequest;

describe("MCP overrideAuth", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("acts as the API key's agent on behalf of the key's user, keeping the rest of the context", async () => {
    const req = mcpRequest("https://cms.example.com/api/mcp");
    const getDefaultMcpAccessSettings = vi.fn(async () => apiKey as never);

    const settings = await overrideAuth(req, getDefaultMcpAccessSettings);

    expect(settings).toBe(apiKey);
    expect(req.context).toEqual({
      auditActor: {
        agent: { keyId: "12", name: "Claude" },
        collection: "payload-mcp-api-keys",
        docId: "12",
        label: "Claude",
        onBehalfOf: { collection: "users", docId: "3", label: "editor@x.io" },
        type: "agent",
        via: "mcp",
      },
      existing: true,
    });
  });

  it("acts as the local dev agent on behalf of the local dev user without asking for a key", async () => {
    const req = mcpRequest("http://localhost:3333/api/mcp");
    const getDefaultMcpAccessSettings = vi.fn();

    const settings = await overrideAuth(req, getDefaultMcpAccessSettings);

    expect(getDefaultMcpAccessSettings).not.toHaveBeenCalled();
    expect(settings.user).toMatchObject({ email: "local-mcp@localhost", id: 0 });
    expect(req.context).toEqual({
      auditActor: {
        agent: { name: "local-dev-mcp" },
        label: "local-dev-mcp",
        onBehalfOf: { collection: "users", docId: "0", label: "local-mcp@localhost" },
        type: "agent",
        via: "mcp",
      },
      existing: true,
    });
  });
});

describe("OIDC login", () => {
  it("records an admin login of the signed-in user through OIDC", async () => {
    const payload = {} as never;
    await logOidcLogin(payload, { email: "sso@x.io", id: 8 });
    expect(logAuditEvent).toHaveBeenCalledWith(payload, {
      action: "auth.login",
      actorOverride: {
        actor: { collection: "users", docId: "8", label: "sso@x.io", source: "auth", type: "user" },
        via: "admin",
      },
      metadata: { method: "oidc" },
      target: { docId: "8", kind: "auth", slug: "users" },
    });
  });
});

describe("OIDC sign-in", () => {
  const ssoUser = { email: "sso@x.io", id: 8 };
  const claims = { displayName: "SSO", email: "sso@x.io" };

  beforeEach(() => {
    steps.length = 0;
    logAuditEvent.mockReset();
    logAuditEvent.mockImplementation(async () => {
      steps.push("log login");
    });
    findOrCreateAdminUser.mockReset();
    findOrCreateAdminUser.mockImplementation(async () => {
      steps.push(`provision as ${JSON.stringify(scopedActors.at(-1))}`);
      return ssoUser;
    });
  });

  it("provisions the user and starts the session as the oidc system actor, then records the login", async () => {
    const payload = {} as never;
    const startSession = vi.fn(async (user: unknown) => {
      steps.push(`session with ${JSON.stringify(scopedActors.at(-1))}`);
      return { redirectFor: user };
    });

    const signedIn = await signInOidcUser(payload, claims, startSession);

    expect(findOrCreateAdminUser).toHaveBeenCalledWith(payload, claims);
    expect(startSession).toHaveBeenCalledWith(ssoUser);
    expect(signedIn).toEqual({ session: { redirectFor: ssoUser }, user: ssoUser });
    expect(steps).toEqual([
      'provision as {"label":"oidc","type":"system"}',
      'session with {"label":"oidc","type":"system"}',
      "log login",
    ]);
    expect(logAuditEvent).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({ action: "auth.login", metadata: { method: "oidc" } })
    );
  });

  it("records no login when the session cannot be started", async () => {
    const failure = new Error("Payload secret not configured");
    await expect(
      signInOidcUser({} as never, claims, async () => {
        throw failure;
      })
    ).rejects.toBe(failure);
    expect(logAuditEvent).not.toHaveBeenCalled();
  });
});

describe("OIDC callback route", () => {
  it("redirects to the login page with the error when the Payload client cannot be created", async () => {
    getPayloadClient.mockRejectedValueOnce(new Error("db unavailable"));

    const response = await GET(new Request("https://cms.example.com/api/auth/oidc/callback"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://cms.example.com/admin/login?error=db%20unavailable"
    );
  });
});

describe("MCP uploadImage", () => {
  it("creates the media with the request's audit actor only, never a user next to overrideAccess", async () => {
    const actor = { label: "Claude", type: "agent" };
    const create = vi.fn(async () => ({ filename: "cat.png", id: 1, url: "/cat.png" }));
    const req = {
      context: { auditActor: actor, other: "not passed" },
      payload: { create },
      user: { email: "editor@x.io", id: 3 },
    } as unknown as PayloadRequest;

    await uploadImage.handler({ images: [{ alt: "A cat", source: "https://x.io/cat.png" }] }, req);

    expect(create).toHaveBeenCalledTimes(1);
    const [args] = create.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(args).toMatchObject({
      collection: "media",
      context: { auditActor: actor },
      data: { alt: "A cat" },
      overrideAccess: true,
    });
    expect(args.context).toEqual({ auditActor: actor });
    expect(args).not.toHaveProperty("user");
    expect(args).not.toHaveProperty("req");
  });
});
