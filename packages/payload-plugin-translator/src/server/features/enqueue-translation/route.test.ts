import { describe, it, expect, vi } from "vitest";
import type { PayloadRequest } from "payload";

import type { AccessGuard } from "../../shared";
import type { TaskRunnerFactory } from "../../modules/task-runner";

import { createEnqueueRoute } from "./route";
import type { EnqueueConfig } from "./model";

// Route-contract tests: pin path + method + access-guard wiring so the Phase 1
// relocation of route registration stays behaviour-preserving. The handler
// logic and the shared wrappers (withAccessCheck / withErrorHandler) are
// covered by their own unit tests; here we only assert the route is wired.
const config: EnqueueConfig = { availableCollections: new Set() };
const denyAccess: AccessGuard = { check: vi.fn().mockReturnValue(false) };

describe("createEnqueueRoute (contract)", () => {
  it("registers POST at {basePath}/enqueue with the default basePath", () => {
    const endpoint = createEnqueueRoute({ create: vi.fn() }, config);
    expect(endpoint.path).toBe("/translate/enqueue");
    expect(endpoint.method).toBe("post");
  });

  it("honors a custom basePath", () => {
    const endpoint = createEnqueueRoute({ create: vi.fn() }, config, undefined, "/i18n");
    expect(endpoint.path).toBe("/i18n/enqueue");
  });

  it("applies the access guard — a denied request gets 403 and never reaches the handler", async () => {
    const taskRunnerFactory: TaskRunnerFactory = { create: vi.fn() };
    const endpoint = createEnqueueRoute(taskRunnerFactory, config, denyAccess);

    const response = await endpoint.handler({} as PayloadRequest);

    expect(response.status).toBe(403);
    expect(denyAccess.check).toHaveBeenCalled();
    expect(taskRunnerFactory.create).not.toHaveBeenCalled();
  });
});
