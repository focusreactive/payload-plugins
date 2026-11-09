import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildEvent,
  logAuditEvent,
  recordAuditEvent,
  writeAuditEvent,
} from "../../src/core/writeEvent";

const SETTINGS = { slug: "audit-events", recordIpAndUserAgent: true };

describe("buildEvent", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fills actor, via, request id and timestamp from req", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T10:00:00.000Z"));
    const req = {
      context: {} as Record<string, unknown>,
      user: { id: 3, collection: "users", email: "u@x.io" },
      payloadAPI: "REST",
      headers: new Headers({ referer: "https://s.io/admin" }),
      locale: "en",
    };
    const e = buildEvent(req, {
      action: "doc.update",
      target: { kind: "collection", slug: "posts", docId: "9" },
      changes: ["title"],
    });
    expect(e).toMatchObject({
      occurredAt: "2026-11-04T10:00:00.000Z",
      action: "doc.update",
      status: "success",
      actor: { type: "user", docId: "3", label: "u@x.io", source: "auth" },
      via: "admin",
      target: { kind: "collection", slug: "posts", docId: "9", locale: "en" },
      changes: ["title"],
    });
    expect(e.requestId).toBe(req.context.__auditRequestId);
  });

  it("takes the timestamp of the operation the event records when there is one", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T10:00:05.000Z"));
    const e = buildEvent(
      { context: {}, payloadAPI: "local" },
      {
        action: "doc.create",
        target: { kind: "collection", slug: "posts", docId: "9" },
        occurredAt: "2026-11-04T10:00:00.000Z",
      }
    );
    expect(e.occurredAt).toBe("2026-11-04T10:00:00.000Z");
  });
});

describe("writeAuditEvent", () => {
  it("inserts through the adapter in the caller's transaction", async () => {
    const create = vi.fn().mockResolvedValue({});
    const payload = { db: { create } };
    const req = { context: {} };
    const event = {
      occurredAt: "t",
      action: "doc.delete" as const,
      status: "success" as const,
      actor: { type: "system" as const, source: "inferred" as const },
      via: "local" as const,
      target: { kind: "collection" as const, slug: "posts", docId: "1" },
    };
    await writeAuditEvent(payload as never, "audit-events", event, req as never);
    expect(create).toHaveBeenCalledWith({
      collection: "audit-events",
      data: event,
      req,
      returning: false,
    });
  });
});

describe("recordAuditEvent", () => {
  it("logs and skips an event that cannot be built instead of throwing", async () => {
    const create = vi.fn();
    const error = vi.fn();
    const req = Object.defineProperty(
      { context: {}, payloadAPI: "REST", payload: { db: { create }, logger: { error } } },
      "headers",
      {
        get() {
          throw new Error("broken req");
        },
      }
    );
    await expect(
      recordAuditEvent(req as never, SETTINGS, {
        action: "doc.update",
        target: { kind: "collection", slug: "posts" },
      })
    ).resolves.toBeUndefined();
    expect(create).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
  });
});

const browser = () =>
  new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1", "user-agent": "Mozilla/5.0" });

describe("recordAuditEvent client", () => {
  const recordWith = async (recordIpAndUserAgent: boolean, headers?: Headers) => {
    const create = vi.fn().mockResolvedValue({});
    const req = { context: {}, payloadAPI: "REST", headers, payload: { db: { create } } };
    await recordAuditEvent(
      req as never,
      { slug: "audit-events", recordIpAndUserAgent },
      {
        action: "doc.update",
        target: { kind: "collection", slug: "posts", docId: "1" },
      }
    );
    return create.mock.calls[0]?.[0].data;
  };

  it("stores the client IP and User-Agent of the request", async () => {
    expect(await recordWith(true, browser())).toMatchObject({
      ip: "203.0.113.7",
      userAgent: "Mozilla/5.0",
    });
  });

  it("stores null for both when the request has no headers", async () => {
    expect(await recordWith(true)).toMatchObject({ ip: null, userAgent: null });
  });

  it("stores neither when recordIpAndUserAgent is off", async () => {
    const data = await recordWith(false, browser());
    expect(data).not.toHaveProperty("ip");
    expect(data).not.toHaveProperty("userAgent");
  });
});

describe("logAuditEvent", () => {
  const payloadWith = (custom: Record<string, unknown> | undefined) => {
    const create = vi.fn().mockResolvedValue({});
    return { create, payload: { db: { create }, config: { custom } } as never };
  };
  const args = {
    action: "auth.login" as const,
    target: { kind: "auth" as const, slug: "users" },
  };

  it("writes to the slug from the plugin config", async () => {
    const { create, payload } = payloadWith({ auditLog: { slug: "my-log" } });
    await logAuditEvent(payload, args);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ collection: "my-log" }));
  });

  it("always writes to the plugin's collection, whatever the caller passes", async () => {
    const { create, payload } = payloadWith({ auditLog: { slug: "my-log" } });
    await logAuditEvent(payload, { ...args, slug: "users" } as never);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ collection: "my-log" }));
  });

  it("stores the client of the given headers, or of the given req", async () => {
    const settings = { auditLog: { slug: "my-log", recordIpAndUserAgent: true } };
    const fromHeaders = payloadWith(settings);
    await logAuditEvent(fromHeaders.payload, {
      ...args,
      headers: new Headers({ "x-real-ip": "198.51.100.4", "user-agent": "curl/8" }),
    });
    expect(fromHeaders.create.mock.calls[0]?.[0].data).toMatchObject({
      ip: "198.51.100.4",
      userAgent: "curl/8",
    });
    const fromReq = payloadWith(settings);
    const req = { context: {}, headers: new Headers({ "user-agent": "Safari" }) };
    await logAuditEvent(fromReq.payload, { ...args, req: req as never });
    expect(fromReq.create.mock.calls[0]?.[0].data).toMatchObject({
      ip: null,
      userAgent: "Safari",
    });
  });

  it("stores no client when recordIpAndUserAgent is off", async () => {
    const { create, payload } = payloadWith({
      auditLog: { slug: "my-log", recordIpAndUserAgent: false },
    });
    await logAuditEvent(payload, { ...args, headers: new Headers({ "user-agent": "curl/8" }) });
    expect(create.mock.calls[0]?.[0].data).not.toHaveProperty("userAgent");
  });

  it("does nothing when the plugin is not installed or disabled", async () => {
    const missing = payloadWith(undefined);
    await logAuditEvent(missing.payload, args);
    expect(missing.create).not.toHaveBeenCalled();
  });
});
