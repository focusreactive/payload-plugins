import { describe, it, expect, vi } from "vitest";
import type { PayloadRequest } from "payload";

import type { AccessGuard } from "../../shared";
import type { TaskRunnerFactory } from "../../modules/task-runner";

import { createCancelByCollectionRoute } from "./route";
import type { CancelConfig } from "./model";

// Route-contract test: pin path + method + access-guard wiring so the Phase 1
// relocation of route registration stays behaviour-preserving. Handler logic
// and the shared wrappers have their own unit tests.
const config: CancelConfig = { availableCollections: new Set() };
const denyAccess: AccessGuard = { check: vi.fn().mockReturnValue(false) };

describe("createCancelByCollectionRoute (contract)", () => {
  it("registers DELETE at {basePath}/cancel-by-collection/:collection_slug with the default basePath", () => {
    const endpoint = createCancelByCollectionRoute(config, { create: vi.fn() });
    expect(endpoint.path).toBe("/translate/cancel-by-collection/:collection_slug");
    expect(endpoint.method).toBe("delete");
  });

  it("honors a custom basePath", () => {
    const endpoint = createCancelByCollectionRoute(config, { create: vi.fn() }, undefined, "/i18n");
    expect(endpoint.path).toBe("/i18n/cancel-by-collection/:collection_slug");
  });

  it("applies the access guard — a denied request gets 403 and never reaches the handler", async () => {
    const taskRunnerFactory: TaskRunnerFactory = { create: vi.fn() };
    const endpoint = createCancelByCollectionRoute(config, taskRunnerFactory, denyAccess);

    const response = await endpoint.handler({} as PayloadRequest);

    expect(response.status).toBe(403);
    expect(denyAccess.check).toHaveBeenCalled();
    expect(taskRunnerFactory.create).not.toHaveBeenCalled();
  });
});
