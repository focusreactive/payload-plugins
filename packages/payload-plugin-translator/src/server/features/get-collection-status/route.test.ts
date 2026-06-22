import { describe, it, expect, vi } from "vitest";
import type { PayloadRequest } from "payload";

import type { AccessGuard } from "../../shared";
import type { TaskRunnerFactory } from "../../modules/task-runner";

import { createGetCollectionStatusRoute } from "./route";
import type { GetCollectionStatusConfig } from "./model";

// Route-contract test: pin path + method + access-guard wiring so the Phase 1
// relocation of route registration stays behaviour-preserving. Handler logic
// and the shared wrappers have their own unit tests.
const config: GetCollectionStatusConfig = { availableCollections: new Set() };
const denyAccess: AccessGuard = { check: vi.fn().mockReturnValue(false) };

describe("createGetCollectionStatusRoute (contract)", () => {
  it("registers GET at {basePath}/collection/:collection_slug with the default basePath", () => {
    const endpoint = createGetCollectionStatusRoute(config, {
      create: vi.fn(),
    });
    expect(endpoint.path).toBe("/translate/collection/:collection_slug");
    expect(endpoint.method).toBe("get");
  });

  it("honors a custom basePath", () => {
    const endpoint = createGetCollectionStatusRoute(
      config,
      { create: vi.fn() },
      undefined,
      "/i18n"
    );
    expect(endpoint.path).toBe("/i18n/collection/:collection_slug");
  });

  it("applies the access guard — a denied request gets 403 and never reaches the handler", async () => {
    const taskRunnerFactory: TaskRunnerFactory = { create: vi.fn() };
    const endpoint = createGetCollectionStatusRoute(config, taskRunnerFactory, denyAccess);

    const response = await endpoint.handler({} as PayloadRequest);

    expect(response.status).toBe(403);
    expect(denyAccess.check).toHaveBeenCalled();
    expect(taskRunnerFactory.create).not.toHaveBeenCalled();
  });
});
