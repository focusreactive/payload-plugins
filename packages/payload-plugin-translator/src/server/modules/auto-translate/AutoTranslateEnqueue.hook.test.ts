import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CollectionSlug, Field } from "payload";

import { AUTO_TRANSLATE_SKIP_CONTEXT_KEY } from "../../../types/AutoTranslateContext";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";

import { makeCollectionPolicyResolver } from "./AutoTranslate.policy";
import type { NormalizedAutoTranslatePolicy } from "./AutoTranslate.policy";
import { makeAutoTranslateHook } from "./AutoTranslateEnqueue.hook";

const schema: Field[] = [{ name: "title", type: "text", localized: true }];
const schemaMap: CollectionSchemaMap = new Map([["posts" as CollectionSlug, schema]]);
const policy: NormalizedAutoTranslatePolicy = {
  targets: ["de", "fr"],
  strategy: "overwrite",
  debounceMs: 0,
};

const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };

function setup(
  opts: {
    policies?: Map<string, NormalizedAutoTranslatePolicy>;
    enqueue?: ReturnType<typeof vi.fn>;
  } = {}
) {
  const enqueue = opts.enqueue ?? vi.fn().mockResolvedValue(undefined);
  const taskRunnerFactory = { create: vi.fn().mockReturnValue({ enqueue }) };
  const resolvePolicy = makeCollectionPolicyResolver(opts.policies ?? new Map([["posts", policy]]));
  const hook = makeAutoTranslateHook({
    resolvePolicy,
    schemaMap,
    taskRunnerFactory: taskRunnerFactory as never,
  });
  return { hook, enqueue };
}

// A CollectionAfterChangeHook args object with sensible defaults (published source-locale update).
function hookArgs(over: Record<string, unknown> = {}) {
  return {
    doc: (over.doc as object) ?? { id: "1", title: "NEW", _status: "published" },
    previousDoc:
      "previousDoc" in over ? over.previousDoc : { id: "1", title: "OLD", _status: "published" },
    collection: (over.collection as object) ?? { slug: "posts", versions: { drafts: true } },
    operation: over.operation ?? "update",
    req: {
      locale: over.locale ?? "en",
      context: over.context ?? {},
      payload: {
        logger,
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

  it("enqueues one job per target on a published source-locale change (R2)", async () => {
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

  it("is best-effort: swallows an enqueue error, logs, never throws (R6)", async () => {
    const enqueue = vi.fn().mockRejectedValue(new Error("queue down"));
    const { hook } = setup({ enqueue });
    await expect(hook(hookArgs())).resolves.toBeDefined();
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

  it("no-drafts collection: any published-less save enqueues", async () => {
    const { hook, enqueue } = setup();
    await hook(
      hookArgs({
        collection: { slug: "posts", versions: { drafts: false } },
        doc: { id: "1", title: "NEW" },
      })
    );
    expect(enqueue).toHaveBeenCalledTimes(1);
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
