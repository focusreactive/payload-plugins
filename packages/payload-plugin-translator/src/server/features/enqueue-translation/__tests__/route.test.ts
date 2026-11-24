import { describe, it, expect, vi } from "vitest";
import type { PayloadRequest } from "payload";

import type { AccessGuard } from "../../../shared/index.js";
import type { TaskRunnerFactory } from "../../../modules/task-runner/index.js";

import { createEnqueueRoute } from "../route.js";
import type { EnqueueConfig } from "../model.js";
import { AnyAccessGuard } from "../../../shared/access/AnyAccessGuard.js";
import { storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";

const OPEN_ON_PURPOSE = new AnyAccessGuard();
const config: EnqueueConfig = {
  availableCollections: new Set(),
  canHoldText: () => true,
  holdsText: () => true,
};
const denyAccess: AccessGuard = { check: vi.fn().mockReturnValue(false) };

const noRuns = () => storeDouble();

describe("createEnqueueRoute (contract)", () => {
  it("registers POST at {basePath}/enqueue with the default basePath", () => {
    const endpoint = createEnqueueRoute(
      { create: vi.fn(), capabilities: { stop: true, run: true }, report: vi.fn() },
      noRuns,
      config,
      OPEN_ON_PURPOSE
    );
    expect(endpoint.path).toBe("/translate/enqueue");
    expect(endpoint.method).toBe("post");
  });

  it("honors a custom basePath", () => {
    const endpoint = createEnqueueRoute(
      { create: vi.fn(), capabilities: { stop: true, run: true }, report: vi.fn() },
      noRuns,
      config,
      OPEN_ON_PURPOSE,
      "/i18n"
    );
    expect(endpoint.path).toBe("/i18n/enqueue");
  });

  it("applies the access guard — a denied request gets 403 and never reaches the handler", async () => {
    const taskRunnerFactory: TaskRunnerFactory = {
      create: vi.fn(),
      capabilities: { stop: true, run: true },
      report: vi.fn(),
    };
    const endpoint = createEnqueueRoute(taskRunnerFactory, noRuns, config, denyAccess);

    const response = await endpoint.handler({} as PayloadRequest);

    expect(response.status).toBe(403);
    expect(denyAccess.check).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: "enqueue" })
    );
    expect(taskRunnerFactory.create).not.toHaveBeenCalled();
  });
});
