import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildEvent,
  logAuditEvent,
  recordAuditEvent,
  writeAuditEvent,
} from "../../src/core/writeEvent";

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
      recordAuditEvent(req as never, "audit-events", {
        action: "doc.update",
        target: { kind: "collection", slug: "posts" },
      })
    ).resolves.toBeUndefined();
    expect(create).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
  });
});

describe("logAuditEvent", () => {
  const payloadWith = (custom: Record<string, unknown> | undefined) => {
    const create = vi.fn().mockResolvedValue({});
    return { create, payload: { db: { create }, config: { custom } } as never };
  };
  const args = {
    action: "system.migration" as const,
    target: { kind: "audit" as const, slug: "migrations" },
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

  it("does nothing when the plugin is not installed or disabled", async () => {
    const missing = payloadWith(undefined);
    await logAuditEvent(missing.payload, args);
    expect(missing.create).not.toHaveBeenCalled();
  });
});
