import { describe, it, expect, vi } from "vitest";
import type { PayloadRequest } from "payload";

import type { AccessGuard } from "../../shared";

import { createGetDocumentStalenessRoute, createDismissStalenessRoute } from "./route";
import type { StalenessConfig } from "./model";

// Route-contract test: pin path + method + access-guard wiring so the Phase 1
// relocation of route registration stays behaviour-preserving. Handler logic
// and the shared wrappers have their own unit tests.
const denyAccess: AccessGuard = { check: vi.fn().mockReturnValue(false) };

const makeConfig = (): StalenessConfig & {
  provenanceServiceFactory: ReturnType<typeof vi.fn>;
} => ({
  availableCollections: new Set(),
  provenanceServiceFactory: vi.fn(),
});

describe("createGetDocumentStalenessRoute (contract)", () => {
  it("registers GET at {basePath}/stale/:collection_slug/:collection_id with the default basePath", () => {
    const endpoint = createGetDocumentStalenessRoute(makeConfig());
    expect(endpoint.path).toBe("/translate/stale/:collection_slug/:collection_id");
    expect(endpoint.method).toBe("get");
  });

  it("honors a custom basePath", () => {
    const endpoint = createGetDocumentStalenessRoute(makeConfig(), undefined, "/i18n");
    expect(endpoint.path).toBe("/i18n/stale/:collection_slug/:collection_id");
  });

  it("applies the access guard — a denied request gets 403 and never reaches the handler", async () => {
    const config = makeConfig();
    const endpoint = createGetDocumentStalenessRoute(config, denyAccess);

    const response = await endpoint.handler({} as PayloadRequest);

    expect(response.status).toBe(403);
    expect(denyAccess.check).toHaveBeenCalled();
    expect(config.provenanceServiceFactory).not.toHaveBeenCalled();
  });
});

describe("createDismissStalenessRoute (contract)", () => {
  it("registers POST at {basePath}/stale/dismiss with the default basePath", () => {
    const endpoint = createDismissStalenessRoute(makeConfig());
    expect(endpoint.path).toBe("/translate/stale/dismiss");
    expect(endpoint.method).toBe("post");
  });

  it("honors a custom basePath", () => {
    const endpoint = createDismissStalenessRoute(makeConfig(), undefined, "/i18n");
    expect(endpoint.path).toBe("/i18n/stale/dismiss");
  });

  it("applies the access guard — a denied request gets 403 and never reaches the handler", async () => {
    const config = makeConfig();
    const endpoint = createDismissStalenessRoute(config, denyAccess);

    const response = await endpoint.handler({} as PayloadRequest);

    expect(response.status).toBe(403);
    expect(denyAccess.check).toHaveBeenCalled();
    expect(config.provenanceServiceFactory).not.toHaveBeenCalled();
  });
});
