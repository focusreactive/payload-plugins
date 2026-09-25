import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CollectionAfterChangeHook, CollectionSlug, Field } from "payload";

import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { TaskRunnerFactory } from "../task-runner/TaskRunnerProvider.interface.js";
import { makeCollectionPolicyResolver } from "./AutoTranslate.policy.js";
import type { NormalizedAutoTranslatePolicy } from "./AutoTranslate.policy.js";
import { makeAutoTranslateHook } from "./AutoTranslateEnqueue.hook.js";

const schemaMap: CollectionSchemaMap = new Map([
  ["posts" as CollectionSlug, [{ name: "title", type: "text", localized: true }] as Field[]],
]);
const policy: NormalizedAutoTranslatePolicy = {
  targets: ["de"],
  strategy: "overwrite",
  debounceMs: 0,
};

const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };

function setup() {
  const enqueue = vi.fn().mockResolvedValue(undefined);
  const taskRunnerFactory = {
    create: vi.fn().mockReturnValue({ enqueue }),
  } as unknown as TaskRunnerFactory;
  const hook = makeAutoTranslateHook({
    resolvePolicy: makeCollectionPolicyResolver(new Map([["posts", policy]])),
    schemaMap,
    taskRunnerFactory,
  });
  return { hook, enqueue };
}

function hookArgs(req: Record<string, unknown>) {
  return {
    doc: { id: "1", title: "NEW", _status: "published" },
    previousDoc: { id: "1", title: "OLD", _status: "published" },
    collection: { slug: "posts", versions: { drafts: true } },
    operation: "update",
    req: {
      locale: "en",
      context: {},
      payload: {
        logger,
        config: { localization: { defaultLocale: "en", locales: ["en", "de"] } },
      },
      ...req,
    },
  } as unknown as Parameters<CollectionAfterChangeHook>[0];
}

describe("auto-translate hook — the triggering transaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hands the triggering request's transaction id to enqueue", async () => {
    const { hook, enqueue } = setup();

    await hook(hookArgs({ transactionID: "tx-99" }));

    expect(enqueue).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ transactionID: "tx-99" })
    );
  });

  it("settles a transaction id that is still a promise", async () => {
    const { hook, enqueue } = setup();

    await hook(hookArgs({ transactionID: Promise.resolve("tx-9") }));

    expect(enqueue).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ transactionID: "tx-9" })
    );
  });

  it("hands no transaction id when the request has none", async () => {
    const { hook, enqueue } = setup();

    await hook(hookArgs({}));

    const scope = enqueue.mock.calls[0]?.[1] as { transactionID?: unknown } | undefined;
    expect(scope?.transactionID).toBeUndefined();
  });

  // Payload reuses one request across every document of a bulk update, so anything written onto it
  // here would leak to the next document in the batch.
  it("does not mutate the triggering request", async () => {
    const { hook } = setup();
    const args = hookArgs({ transactionID: "tx-99" });
    const before = JSON.stringify(Object.keys(args.req).sort());
    const contextBefore = JSON.stringify(args.req.context);

    await hook(args);

    expect(JSON.stringify(Object.keys(args.req).sort())).toBe(before);
    expect(JSON.stringify(args.req.context)).toBe(contextBefore);
  });
});
