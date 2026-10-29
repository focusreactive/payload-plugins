import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, PayloadRequest } from "payload";

import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { FieldLike } from "../../../core/kernel/field-traversal/index.js";
import type { ProvenanceStore } from "../../../core/domain/provenance/index.js";
import { ProvenanceService, provenanceIo } from "../../modules/provenance/index.js";

import { DismissStalenessHandler } from "./dismissStaleness.handler.js";
import type { StalenessConfig } from "./model.js";

vi.mock("../../shared/access/permission.js", () => ({
  mayInitiate: vi.fn(),
}));

const askedAbout = async () =>
  (await import("../../shared/access/permission.js")).mayInitiate as ReturnType<typeof vi.fn>;

const ANNA = { id: "anna", collection: "users" };
const schema = [{ name: "title", type: "text", localized: true }] as FieldLike[];

describe("POST /stale/dismiss — it asks before it re-bases", () => {
  let payload: Payload;
  let rebaseSourceFingerprint: ReturnType<typeof vi.fn>;
  let store: ProvenanceStore;

  const config = (): StalenessConfig =>
    ({
      availableCollections: new Set(["posts"]),
      provenanceServiceFactory: (p: Payload) =>
        new ProvenanceService(
          store,
          new Map([["posts", schema]]) as CollectionSchemaMap,
          {},
          provenanceIo(p)
        ),
    }) as unknown as StalenessConfig;

  const request = (): PayloadRequest =>
    ({
      payload,
      user: ANNA,
      json: async () => ({ collection_slug: "posts", collection_id: "1", target_lng: "de" }),
    }) as unknown as PayloadRequest;

  beforeEach(async () => {
    vi.clearAllMocks();
    rebaseSourceFingerprint = vi.fn().mockResolvedValue(undefined);
    store = {
      find: vi.fn().mockResolvedValue({ sourceLocale: "en", sourceFingerprint: {} }),
      rebaseSourceFingerprint,
    } as unknown as ProvenanceStore;
    payload = {
      findByID: vi.fn().mockResolvedValue({ id: "1", title: "Saved" }),
      logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    } as unknown as Payload;
    (await askedAbout()).mockResolvedValue(true);
  });

  it("refuses a caller the collection's rule would not let save", async () => {
    (await askedAbout()).mockResolvedValue(false);

    const response = await new DismissStalenessHandler(config()).handle(request());

    expect(response.status).toBe(403);
  });

  it("leaves the receipt alone for a caller it refuses", async () => {
    (await askedAbout()).mockResolvedValue(false);

    await new DismissStalenessHandler(config()).handle(request());

    expect(rebaseSourceFingerprint).not.toHaveBeenCalled();
  });

  it("asks about the document the request named, as the caller", async () => {
    await new DismissStalenessHandler(config()).handle(request());

    expect(await askedAbout()).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "posts", id: "1", user: ANNA })
    );
  });

  it("still dismisses for a caller the rule allows", async () => {
    const response = await new DismissStalenessHandler(config()).handle(request());

    expect(response.status).toBe(200);
    expect(rebaseSourceFingerprint).toHaveBeenCalled();
  });
});
