import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CollectionAfterChangeHook, CollectionSlug, Field } from "payload";

import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import type { TaskRunnerFactory } from "../task-runner/TaskRunnerProvider.interface";
import { makeCollectionPolicyResolver } from "./AutoTranslate.policy";
import type { NormalizedAutoTranslatePolicy } from "./AutoTranslate.policy";
import { makeAutoTranslateHook } from "./AutoTranslateEnqueue.hook";

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

// The editor who saved is the only identity this path has, and it is available right here. Dropping it
// is why a translated write has been landing with access control switched off.
describe("auto-translate hook — whose identity reaches the runner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hands the saving user to enqueue", async () => {
    const { hook, enqueue } = setup();

    await hook(hookArgs({ user: { id: "anna", collection: "users" } }));

    const [, scope] = enqueue.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(scope).toMatchObject({ userId: "anna", userCollection: "users" });
  });

  it("hands no identity when the save carried none", async () => {
    const { hook, enqueue } = setup();

    await hook(hookArgs({ user: null }));

    const [, scope] = enqueue.mock.calls[0] as [unknown, Record<string, unknown> | undefined];
    expect(scope?.userId ?? null).toBeNull();
  });

  // A bulk update maps every document over one shared request; anything written onto it would reach
  // the next document in the batch.
  it("does not mutate the request it read the user from", async () => {
    const { hook } = setup();
    const args = hookArgs({ user: { id: "anna", collection: "users" } });
    const before = JSON.stringify(Object.keys(args.req).sort());

    await hook(args);

    expect(JSON.stringify(Object.keys(args.req).sort())).toBe(before);
  });
});
