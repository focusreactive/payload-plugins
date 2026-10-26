import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, CollectionSlug } from "payload";

import { translateDocument } from "../translateDocument.js";
import type { TranslateDocumentDeps } from "../translateDocument.js";
import type { TranslationProvider } from "../../../../core/domain/translation-providers/index.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import type { TaskHandlerInput } from "../../../modules/task-runner/index.js";
import { asRequester } from "../../../shared/payload/RequestScope.shapes.js";

vi.mock("../../../../core/translation-pipeline/index.js", () => ({
  translateContent: vi.fn().mockResolvedValue({
    translatedData: { title: "Titel" },
    leaves: [{ idPath: "title", answeredInFull: true }],
  }),
}));

vi.mock("../../../shared/access/permission.js", () => ({
  rebuildRequester: vi.fn().mockResolvedValue(null),
  checkTranslationPermission: vi.fn(),
  mayWrite: vi.fn().mockResolvedValue(true),
}));

const permission = async () =>
  (await import("../../../shared/access/permission.js")).checkTranslationPermission as ReturnType<
    typeof vi.fn
  >;

const rebuilt = async () =>
  (await import("../../../shared/access/permission.js")).rebuildRequester as ReturnType<
    typeof vi.fn
  >;

const ANNA = { id: "anna", collection: "users" };

// Two paths, two answers. The deferred path runs on a request of its own, so Payload's own refusal
// costs only the translation and is worth having on top of the pre-check. The inline path carries the
// editor's transaction, and a refusal Payload raises there would roll their save back — which is the
// reason the pre-check exists in the first place.
describe("translateDocument — where Payload's own enforcement is affordable", () => {
  let deps: TranslateDocumentDeps;
  let payload: Payload;

  const input = (): TaskHandlerInput => ({
    collection: "posts" as CollectionSlug,
    collectionId: "doc-123",
    sourceLng: "en",
    targetLng: "de",
    publishOnTranslation: false,
    previousAttempts: 0,
  });

  const writeArgs = () =>
    (payload.update as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const provider: TranslationProvider = { translate: vi.fn().mockResolvedValue({}) };
    const schemaMap = new Map([
      ["posts" as CollectionSlug, [{ name: "title", type: "text", localized: true }]],
    ]) as CollectionSchemaMap;

    payload = {
      findByID: vi.fn().mockResolvedValue({ id: "doc-123", title: "Test" }),
      update: vi.fn().mockResolvedValue({}),
      logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
      collections: { posts: { config: { versions: { drafts: true } } } },
    } as unknown as Payload;

    deps = { translationProvider: provider, schemaMap };
    (await permission()).mockResolvedValue(true);
    (await rebuilt()).mockResolvedValue(ANNA);
  });

  it("lets Payload check the deferred write as well", async () => {
    await translateDocument(deps, payload, input(), { requester: asRequester("anna", "users") });

    expect(writeArgs()).toMatchObject({ overrideAccess: false, user: ANNA });
  });

  // Inside the editor's transaction too: Payload deletes a field the requester may not write and
  // does not throw, so there is no refusal here for `killTransaction` to act on.
  it("lets Payload check the inline write as well", async () => {
    await translateDocument(deps, payload, input(), {
      transactionID: "tx-1",
      requester: asRequester("anna", "users"),
    });

    expect(writeArgs()).toMatchObject({ overrideAccess: false, user: ANNA });
  });

  it("adds nothing when the request named nobody", async () => {
    (await rebuilt()).mockResolvedValue(null);

    await translateDocument(deps, payload, input(), {});

    expect(writeArgs()).not.toHaveProperty("overrideAccess");
  });
});
