import { describe, it, expect, vi, afterEach } from "vitest";
import type { PayloadRequest } from "payload";
import { withAccessCheck } from "../withAccessCheck.js";
import { ServerResponse } from "../ServerResponse.js";
import type { AccessGuard } from "../../access/types.js";

describe("withAccessCheck", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockRequest = (): PayloadRequest =>
    ({
      user: { id: "user-1" },
    }) as unknown as PayloadRequest;

  const createMockAccessGuard = (allowed: boolean): AccessGuard => ({
    check: vi.fn().mockResolvedValue(allowed),
  });

  it("calls handler when access is allowed", async () => {
    const expectedResponse = ServerResponse.success({ data: "test" });
    const handler = vi.fn().mockResolvedValue(expectedResponse);
    const accessGuard = createMockAccessGuard(true);
    const req = createMockRequest();

    const wrappedHandler = withAccessCheck(handler, accessGuard, "enqueue");
    const result = await wrappedHandler(req);

    expect(accessGuard.check).toHaveBeenCalledWith({ req, action: "enqueue" });
    expect(handler).toHaveBeenCalledWith(req);
    expect(result).toBe(expectedResponse);
  });

  it("returns 403 when access is denied", async () => {
    const handler = vi.fn().mockResolvedValue(ServerResponse.success());
    const accessGuard = createMockAccessGuard(false);
    const req = createMockRequest();

    const wrappedHandler = withAccessCheck(handler, accessGuard, "cancel");
    const result = await wrappedHandler(req);

    expect(accessGuard.check).toHaveBeenCalledWith({ req, action: "cancel" });
    expect(handler).not.toHaveBeenCalled();
    expect(result.status).toBe(403);
    expect(await result.json()).toEqual({ message: "Forbidden" });
  });

  it("passes the request and the route's own action to the guard", async () => {
    const handler = vi.fn().mockResolvedValue(ServerResponse.success());
    const accessGuard = createMockAccessGuard(true);
    const req = createMockRequest();

    const wrappedHandler = withAccessCheck(handler, accessGuard, "dismiss-staleness");
    await wrappedHandler(req);

    expect(accessGuard.check).toHaveBeenCalledWith({ req, action: "dismiss-staleness" });
  });

  it("returns 403 for a truthy answer that is not true, and does not run the handler", async () => {
    const handler = vi.fn().mockResolvedValue(ServerResponse.success());
    const almostYes = { check: vi.fn().mockResolvedValue("yes") } as unknown as AccessGuard;

    const result = await withAccessCheck(handler, almostYes, "enqueue")(createMockRequest());

    expect(handler).not.toHaveBeenCalled();
    expect(result.status).toBe(403);
  });

  it("returns 403 when the guard throws, instead of letting the failure out", async () => {
    const handler = vi.fn().mockResolvedValue(ServerResponse.success());
    const exploding = {
      check: vi.fn().mockRejectedValue(new Error("guard exploded")),
    } as unknown as AccessGuard;
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await withAccessCheck(handler, exploding, "enqueue")(createMockRequest());

    expect(handler).not.toHaveBeenCalled();
    expect(result.status).toBe(403);
  });
});
