import { describe, it, expect, vi } from "vitest";
import type { PayloadRequest } from "payload";

import type { AccessGuard } from "../../shared";
import type { TaskRunnerFactory } from "../../modules/task-runner";

import { createCancelRoute } from "./route";

// Route-contract test: pin path + method + access-guard wiring so the Phase 1
// relocation of route registration stays behaviour-preserving. Handler logic
// and the shared wrappers have their own unit tests.
const denyAccess: AccessGuard = { check: vi.fn().mockReturnValue(false) };

describe("createCancelRoute (contract)", () => {
  it("registers DELETE at {basePath}/cancel with the default basePath", () => {
    const endpoint = createCancelRoute({ create: vi.fn() });
    expect(endpoint.path).toBe("/translate/cancel");
    expect(endpoint.method).toBe("delete");
  });

  it("honors a custom basePath", () => {
    const endpoint = createCancelRoute({ create: vi.fn() }, undefined, "/i18n");
    expect(endpoint.path).toBe("/i18n/cancel");
  });

  it("applies the access guard — a denied request gets 403 and never reaches the handler", async () => {
    const taskRunnerFactory: TaskRunnerFactory = { create: vi.fn() };
    const endpoint = createCancelRoute(taskRunnerFactory, denyAccess);

    const response = await endpoint.handler({} as PayloadRequest);

    expect(response.status).toBe(403);
    expect(denyAccess.check).toHaveBeenCalled();
    expect(taskRunnerFactory.create).not.toHaveBeenCalled();
  });
});
