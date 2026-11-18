import { describe, it, expect, vi } from "vitest";
import type { CollectionSlug, PayloadRequest } from "payload";

import type { AccessGuard } from "../../../shared/index.js";
import type { TaskRunnerFactory } from "../../../modules/task-runner/index.js";

import { createRunRoute } from "../route.js";
import { AnyAccessGuard } from "../../../shared/access/AnyAccessGuard.js";
import { storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";

const AVAILABLE = { availableCollections: new Set<CollectionSlug>() };

const OPEN_ON_PURPOSE = new AnyAccessGuard();
// Route-contract test: pin path + method + access-guard wiring so the Phase 1
// relocation of route registration stays behaviour-preserving. Handler logic
// and the shared wrappers have their own unit tests.
const denyAccess: AccessGuard = { check: vi.fn().mockReturnValue(false) };

const noRuns = () => storeDouble();

describe("createRunRoute (contract)", () => {
  it("registers POST at the document's address with the default basePath", () => {
    const endpoint = createRunRoute(
      AVAILABLE,
      { create: vi.fn(), capabilities: { stop: true, run: true } },
      noRuns,
      OPEN_ON_PURPOSE
    );
    expect(endpoint.path).toBe("/translate/run/:collection_slug/:collection_id");
    expect(endpoint.method).toBe("post");
  });

  it("honors a custom basePath", () => {
    const endpoint = createRunRoute(
      AVAILABLE,
      { create: vi.fn(), capabilities: { stop: true, run: true } },
      noRuns,
      OPEN_ON_PURPOSE,
      "/i18n"
    );
    expect(endpoint.path).toBe("/i18n/run/:collection_slug/:collection_id");
  });

  it("applies the access guard — a denied request gets 403 and never reaches the handler", async () => {
    const taskRunnerFactory: TaskRunnerFactory = {
      create: vi.fn(),
      capabilities: { stop: true, run: true },
    };
    const endpoint = createRunRoute(AVAILABLE, taskRunnerFactory, noRuns, denyAccess);

    const response = await endpoint.handler({} as PayloadRequest);

    expect(response.status).toBe(403);
    expect(denyAccess.check).toHaveBeenLastCalledWith(expect.objectContaining({ action: "run" }));
    expect(taskRunnerFactory.create).not.toHaveBeenCalled();
  });
});
