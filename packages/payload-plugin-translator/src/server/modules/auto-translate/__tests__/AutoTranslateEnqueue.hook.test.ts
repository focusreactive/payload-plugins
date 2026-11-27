import { TransportError } from "../../../../translation-providers/shared/errors/index.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CollectionSlug, Field } from "payload";
import { APIError } from "payload";

import { AUTO_TRANSLATE_SKIP_CONTEXT_KEY } from "../../../../types/AutoTranslateContext.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";

import {
  AUTO_TRANSLATE_CUSTOM_KEY,
  getAutoTranslateConfig,
} from "../../../../core/domain/auto-translate/index.js";

import { makeCollectionPolicyResolver } from "../AutoTranslate.policy.js";
import type { NormalizedAutoTranslatePolicy } from "../AutoTranslate.policy.js";
import {
  makeAutoTranslateHook,
  propagateAutoTranslateCustom,
} from "../AutoTranslateEnqueue.hook.js";
import { fingerprintsOf } from "../../provenance/__tests__/fixtures/fingerprinter.js";
import { storeDouble } from "../../runs/__tests__/fixtures/runRecordStore.js";
import { publishedHistory } from "./publishedHistory.js";

const schema: Field[] = [{ name: "title", type: "text", localized: true }];
const schemaMap: CollectionSchemaMap = new Map([["posts" as CollectionSlug, schema]]);
const policy: NormalizedAutoTranslatePolicy = {
  targets: ["de", "fr"],
  debounceMs: 0,
};

const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };

function setup(
  opts: {
    policies?: Map<string, NormalizedAutoTranslatePolicy>;
    enqueue?: ReturnType<typeof vi.fn>;
    inFlight?: unknown[];
  } = {}
) {
  const enqueue = opts.enqueue ?? vi.fn().mockResolvedValue(undefined);
  const taskRunnerFactory = { create: vi.fn().mockReturnValue({ enqueue }) };
  const resolvePolicy = makeCollectionPolicyResolver(opts.policies ?? new Map([["posts", policy]]));
  const runs = storeDouble({
    findLiveForDocuments: vi.fn().mockResolvedValue(opts.inFlight ?? []),
  });
  const hook = makeAutoTranslateHook({
    resolvePolicy,
    fingerprintOf: fingerprintsOf(schemaMap),
    taskRunnerFactory: taskRunnerFactory as never,
    runRecordStoreFactory: () => runs,
  });
  return { hook, enqueue, runs };
}

// A CollectionAfterChangeHook args object with sensible defaults (published source-locale update).
function hookArgs(over: Record<string, unknown> = {}) {
  const doc = (over.doc as object) ?? { id: "1", title: "NEW", _status: "published" };
  const previousDoc =
    "previousDoc" in over ? over.previousDoc : { id: "1", title: "OLD", _status: "published" };
  // Defaults to agreeing with `previousDoc`, so a case that does not care about the published layer
  // reads as it always did; `history` is how a case makes the two disagree.
  const history = ("history" in over ? over.history : [doc, previousDoc]) as unknown[];

  return {
    doc,
    previousDoc,
    collection: (over.collection as object) ?? { slug: "posts", versions: { drafts: true } },
    operation: over.operation ?? "update",
    req: {
      ...(over.transactionID == null ? {} : { transactionID: over.transactionID }),
      locale: over.locale ?? "en",
      context: over.context ?? {},
      payload: {
        logger,
        findVersions: publishedHistory(...history),
        config: {
          localization:
            over.localization === undefined
              ? { defaultLocale: "en", locales: ["en", "de", "fr"] }
              : over.localization,
        },
      },
    },
  } as never;
}

describe("makeAutoTranslateHook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("enqueues one run per target on a published source-locale change (R2)", async () => {
    const { hook, enqueue } = setup();
    await hook(hookArgs());
    expect(enqueue).toHaveBeenCalledTimes(1);
    const tasks = enqueue.mock.calls[0][0] as Array<{ targetLng: string; sourceLng: string }>;
    expect(tasks.map((t) => t.targetLng)).toEqual(["de", "fr"]);
    expect(tasks.every((t) => t.sourceLng === "en")).toBe(true);
  });

  it("does not enqueue when translatable content is unchanged (drift-gate, R3)", async () => {
    const { hook, enqueue } = setup();
    await hook(
      hookArgs({
        doc: { id: "1", title: "SAME", _status: "published" },
        previousDoc: { id: "1", title: "SAME", _status: "published" },
      })
    );
    expect(enqueue).not.toHaveBeenCalled();
  });

  // The defect this read exists to fix, at the only altitude a unit test can reach it: Payload hands
  // the hook a `previousDoc` that is the draft already holding the published text, so the two
  // disagree and only the published layer answers truthfully.
  it("enqueues when the text arrived in a draft, so only the previous publish shows the change", async () => {
    const { hook, enqueue } = setup();
    const published = { id: "1", title: "NEW", _status: "published" };

    await hook(
      hookArgs({
        doc: published,
        previousDoc: { id: "1", title: "NEW", _status: "draft" },
        history: [published, { id: "1", title: "OLD", _status: "published" }],
      })
    );

    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it("does not enqueue when the previous publish holds the same text, whatever the draft held", async () => {
    const { hook, enqueue } = setup();
    const published = { id: "1", title: "SAME", _status: "published" };

    await hook(
      hookArgs({
        doc: published,
        previousDoc: { id: "1", title: "A SECOND THOUGHT", _status: "draft" },
        history: [published, { id: "1", title: "SAME", _status: "published" }],
      })
    );

    expect(enqueue).not.toHaveBeenCalled();
  });

  it("enqueues on a first publish, when there is no earlier publish to compare against", async () => {
    const { hook, enqueue } = setup();
    const published = { id: "1", title: "NEW", _status: "published" };

    await hook(hookArgs({ doc: published, previousDoc: published, history: [published] }));

    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it("asks the published layer inside the save's transaction, in the source locale, over access", async () => {
    const { hook } = setup();
    const args = hookArgs({ transactionID: "tx-7" });

    await hook(args);

    const { findVersions } = (
      args as unknown as { req: { payload: { findVersions: ReturnType<typeof vi.fn> } } }
    ).req.payload;
    expect(findVersions).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "posts",
        locale: "en",
        limit: 2,
        sort: "-updatedAt",
        overrideAccess: true,
        req: { transactionID: "tx-7" },
        where: {
          and: [{ parent: { equals: "1" } }, { "version._status": { equals: "published" } }],
        },
      })
    );
  });

  it("does not enqueue for a non-source-locale write (loop guard, R4)", async () => {
    const { hook, enqueue } = setup();
    await hook(hookArgs({ locale: "de" }));
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("does not enqueue when the translator's own skip flag is set — loop CLOSES via the shared constant (R4/AC15)", async () => {
    const { hook, enqueue } = setup();
    await hook(hookArgs({ context: { [AUTO_TRANSLATE_SKIP_CONTEXT_KEY]: true } }));
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("is best-effort: swallows an enqueue error of ours, logs, never throws (R6)", async () => {
    const enqueue = vi.fn().mockRejectedValue(new TransportError("queue down"));
    const { hook } = setup({ enqueue });
    await expect(hook(hookArgs())).resolves.toBeDefined();
    expect(logger.error).toHaveBeenCalled();
  });

  it("swallows one of ours even inside the caller's transaction (R6)", async () => {
    const enqueue = vi.fn().mockRejectedValue(new TransportError("queue down"));
    const { hook } = setup({ enqueue });

    await expect(
      hook(hookArgs({ transactionID: "tx-1" })),
      "a failure of ours ran no Payload operation, so the editor's save is untouched"
    ).resolves.toBeDefined();
    expect(logger.error).toHaveBeenCalled();
  });

  it("but lets a failure that did not come from the translator out (R6)", async () => {
    const fromPayload = new APIError("Validation failed", 400);
    const enqueue = vi.fn().mockRejectedValue(fromPayload);
    const { hook } = setup({ enqueue });

    await expect(
      hook(hookArgs({ transactionID: "tx-1" })),
      "a foreign error means a Payload operation already rolled the editor's save back"
    ).rejects.toBe(fromPayload);
  });

  it("and swallows the same failure when the caller has no transaction to lose", async () => {
    const enqueue = vi.fn().mockRejectedValue(new APIError("Validation failed", 400));
    const { hook } = setup({ enqueue });

    await expect(
      hook(hookArgs()),
      "nothing of the editor's was carried by a transaction, so their save is still intact"
    ).resolves.toBeDefined();
    expect(logger.error).toHaveBeenCalled();
  });

  it("publish-gate: an update to a draft does NOT enqueue; a published update does (D8)", async () => {
    const draft = setup();
    await draft.hook(hookArgs({ doc: { id: "1", title: "NEW", _status: "draft" } }));
    expect(draft.enqueue).not.toHaveBeenCalled();

    const published = setup();
    await published.hook(hookArgs({ doc: { id: "1", title: "NEW", _status: "published" } }));
    expect(published.enqueue).toHaveBeenCalledTimes(1);
  });

  it("publish-gate on create: create-of-published enqueues, create-of-draft does not (D8)", async () => {
    const published = setup();
    await published.hook(
      hookArgs({
        operation: "create",
        previousDoc: undefined,
        doc: { id: "1", title: "NEW", _status: "published" },
      })
    );
    expect(published.enqueue).toHaveBeenCalledTimes(1);

    const draft = setup();
    await draft.hook(
      hookArgs({
        operation: "create",
        previousDoc: undefined,
        doc: { id: "1", title: "NEW", _status: "draft" },
      })
    );
    expect(draft.enqueue).not.toHaveBeenCalled();
  });

  it("no-drafts collection: any published-less save enqueues, and no published layer is consulted", async () => {
    const { hook, enqueue } = setup();
    const args = hookArgs({
      collection: { slug: "posts", versions: { drafts: false } },
      doc: { id: "1", title: "NEW" },
    });

    await hook(args);

    expect(enqueue).toHaveBeenCalledTimes(1);
    const { findVersions } = (
      args as unknown as { req: { payload: { findVersions: ReturnType<typeof vi.fn> } } }
    ).req.payload;
    expect(findVersions).not.toHaveBeenCalled();
  });

  it("no-ops (no enqueue, no throw, warns) when no source locale is resolvable (R2/AC14)", async () => {
    const { hook, enqueue } = setup();
    await expect(hook(hookArgs({ localization: false }))).resolves.toBeDefined();
    expect(enqueue).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("does nothing for a collection that did not opt in", async () => {
    const { hook, enqueue } = setup({ policies: new Map() });
    await hook(hookArgs());
    expect(enqueue).not.toHaveBeenCalled();
  });
});

describe("propagateAutoTranslateCustom", () => {
  const policies = new Map<string, NormalizedAutoTranslatePolicy>([["posts", policy]]);
  type TestConfig = { collections: Array<{ slug: string; custom?: Record<string, unknown> }> };

  it("stamps the opt-in onto a registered collection that has no custom yet (the dev scenario, D2)", () => {
    // The REGISTERED collection is a different object than the wrapped one — starts with no custom.
    const config: TestConfig = { collections: [{ slug: "posts" }] };
    propagateAutoTranslateCustom(config, new Set(["posts"]), policies);
    const read = getAutoTranslateConfig(config.collections[0]);
    expect(read).not.toBeNull();
    expect(read?.targets).toEqual(["de", "fr"]);
  });

  it("preserves other custom keys when stamping", () => {
    const config: TestConfig = { collections: [{ slug: "posts", custom: { other: 1 } }] };
    propagateAutoTranslateCustom(config, new Set(["posts"]), policies);
    const stamped = config.collections[0].custom as Record<string, unknown>;
    expect(stamped.other).toBe(1);
    expect(stamped[AUTO_TRANSLATE_CUSTOM_KEY]).toBeDefined();
  });

  it("does not stamp a collection that is not in the enabled set", () => {
    const config: TestConfig = { collections: [{ slug: "pages" }] };
    propagateAutoTranslateCustom(config, new Set(["posts"]), policies);
    expect(getAutoTranslateConfig(config.collections[0])).toBeNull();
  });

  describe("a document already being translated", () => {
    it("queues nothing, because a second run would put the first run's locales back", async () => {
      const { hook, enqueue } = setup({
        inFlight: [{ collectionSlug: "posts", collectionId: "1" }],
      });

      await hook(hookArgs());

      expect(enqueue).not.toHaveBeenCalled();
    });

    it("leaves the editor's save alone, even inside their transaction, and says why in the log", async () => {
      const { hook } = setup({ inFlight: [{ collectionSlug: "posts", collectionId: "1" }] });

      const answer = await hook(hookArgs({ transactionID: "tx-1" }));

      expect(answer, "the hook answers with the document, so the save goes through").toMatchObject({
        id: "1",
      });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: "1", collection: "posts" })
      );
      expect(logger.error, "nothing failed; it was simply not queued").not.toHaveBeenCalled();
    });

    it("asks only about the document that was saved", async () => {
      const { hook, runs } = setup({ inFlight: [] });

      await hook(hookArgs());

      expect(runs.findLiveForDocuments).toHaveBeenCalledWith("posts", ["1"]);
    });

    it("queues as usual once nothing is under way", async () => {
      const { hook, enqueue } = setup({ inFlight: [] });

      await hook(hookArgs());

      expect(enqueue).toHaveBeenCalledTimes(1);
    });
  });
});
