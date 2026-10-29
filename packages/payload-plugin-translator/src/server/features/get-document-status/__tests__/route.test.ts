import { describe, it, expect, vi } from "vitest";
import type { PayloadRequest } from "payload";

import type { AccessGuard } from "../../../shared/index.js";

import { createGetDocumentStatusRoute } from "../route.js";
import type { GetDocumentStatusConfig } from "../model.js";
import { AnyAccessGuard } from "../../../shared/access/AnyAccessGuard.js";
import { storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";

const OPEN_ON_PURPOSE = new AnyAccessGuard();
// Route-contract test: pin path + method + access-guard wiring so the Phase 1
// relocation of route registration stays behaviour-preserving. Handler logic
// and the shared wrappers have their own unit tests.
const config: GetDocumentStatusConfig = { availableCollections: new Set() };
const denyAccess: AccessGuard = { check: vi.fn().mockReturnValue(false) };

const noRuns = () => storeDouble();

describe("createGetDocumentStatusRoute (contract)", () => {
  it("registers GET at {basePath}/document/:collection_slug/:collection_id with the default basePath", () => {
    const endpoint = createGetDocumentStatusRoute(config, noRuns, OPEN_ON_PURPOSE);
    expect(endpoint.path).toBe("/translate/document/:collection_slug/:collection_id");
    expect(endpoint.method).toBe("get");
  });

  it("honors a custom basePath", () => {
    const endpoint = createGetDocumentStatusRoute(config, noRuns, OPEN_ON_PURPOSE, "/i18n");
    expect(endpoint.path).toBe("/i18n/document/:collection_slug/:collection_id");
  });

  it("applies the access guard — a denied request gets 403 and never reaches the handler", async () => {
    const openTheRecord = vi.fn(() => storeDouble());
    const endpoint = createGetDocumentStatusRoute(config, openTheRecord, denyAccess);

    const response = await endpoint.handler({} as PayloadRequest);

    expect(response.status).toBe(403);
    expect(denyAccess.check).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: "document-status" })
    );
    expect(openTheRecord, "a refused request reads nothing").not.toHaveBeenCalled();
  });
});
