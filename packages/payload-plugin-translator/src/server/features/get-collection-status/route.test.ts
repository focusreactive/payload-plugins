import { describe, it, expect, vi } from "vitest";
import type { PayloadRequest } from "payload";

import type { AccessGuard } from "../../shared/index.js";

import { createGetCollectionStatusRoute } from "./route.js";
import type { GetCollectionStatusConfig } from "./model.js";
import { AnyAccessGuard } from "../../shared/access/AnyAccessGuard.js";
import { storeDouble } from "../../modules/runs/__tests__/fixtures/runRecordStore.js";

const OPEN_ON_PURPOSE = new AnyAccessGuard();
// Route-contract test: pin path + method + access-guard wiring so the Phase 1
// relocation of route registration stays behaviour-preserving. Handler logic
// and the shared wrappers have their own unit tests.
const config: GetCollectionStatusConfig = { availableCollections: new Set(), failedWindowMs: 3 };
const denyAccess: AccessGuard = { check: vi.fn().mockReturnValue(false) };

const noRuns = () => storeDouble();

describe("createGetCollectionStatusRoute (contract)", () => {
  it("registers GET at {basePath}/collection/:collection_slug with the default basePath", () => {
    const endpoint = createGetCollectionStatusRoute(config, noRuns, OPEN_ON_PURPOSE);
    expect(endpoint.path).toBe("/translate/collection/:collection_slug");
    expect(endpoint.method).toBe("get");
  });

  it("honors a custom basePath", () => {
    const endpoint = createGetCollectionStatusRoute(config, noRuns, OPEN_ON_PURPOSE, "/i18n");
    expect(endpoint.path).toBe("/i18n/collection/:collection_slug");
  });

  it("applies the access guard — a denied request gets 403 and never reaches the handler", async () => {
    const openTheRecord = vi.fn(() => storeDouble());
    const endpoint = createGetCollectionStatusRoute(config, openTheRecord, denyAccess);

    const response = await endpoint.handler({} as PayloadRequest);

    expect(response.status).toBe(403);
    expect(denyAccess.check).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: "collection-status" })
    );
    expect(openTheRecord, "a refused request reads nothing").not.toHaveBeenCalled();
  });
});
