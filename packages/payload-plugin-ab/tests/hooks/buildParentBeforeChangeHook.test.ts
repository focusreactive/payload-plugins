import { describe, expect, it, vi } from "vitest";
import { buildParentBeforeChangeHook } from "../../src/hooks/buildParentBeforeChangeHook";
import { AB_CASCADE_CONTEXT_KEY, AB_PENDING_CONTEXT_KEY } from "../../src/constants";
import type { AbTestingPluginConfig, CollectionABConfig } from "../../src/types/config";

const abConfig: CollectionABConfig = { generatePath: () => null };
const pluginConfig = {
  collections: { pages: abConfig },
  storage: {} as never,
} as AbTestingPluginConfig;

const hook = buildParentBeforeChangeHook("pages", abConfig, pluginConfig);

function makeReq(results: Record<string, unknown>[][] = []) {
  let call = 0;
  const find = vi.fn().mockImplementation(() => {
    const docs = results[call] ?? [];
    call += 1;
    return Promise.resolve({ docs });
  });
  const context: Record<string, unknown> = {};
  return { req: { payload: { find }, context } as never, find, context };
}

const run = (args: Record<string, unknown>) =>
  (hook as unknown as (a: Record<string, unknown>) => Promise<unknown>)(args);

const variant = (id: string, pct: number, status = "published") => ({
  id,
  _abPassPercentage: pct,
  _status: status,
});

describe("buildParentBeforeChangeHook", () => {
  it("does nothing while a parent-driven cascade is running", async () => {
    const { req, find } = makeReq();
    req.context[AB_CASCADE_CONTEXT_KEY] = true;
    await run({
      data: { _abPendingPercentages: { v1: 30 } },
      originalDoc: { id: "p1" },
      req,
      operation: "update",
    });
    expect(find).not.toHaveBeenCalled();
  });

  it("does not query when a draft is saved with no pending changes", async () => {
    const { req, find } = makeReq();
    await run({ data: { _status: "draft" }, originalDoc: { id: "p1" }, req, operation: "update" });
    expect(find).not.toHaveBeenCalled();
  });

  it("queries on publish even with no pending changes, to flush earlier draft percentages", async () => {
    const { req, find, context } = makeReq([[variant("v1", 30, "draft")], [variant("v1", 10)]]);
    await run({
      data: { _status: "published" },
      originalDoc: { id: "p1" },
      req,
      operation: "update",
    });
    expect(find).toHaveBeenCalledTimes(2);
    expect(context[AB_PENDING_CONTEXT_KEY]).toMatchObject([{ variantId: "v1", desired: 30 }]);
  });

  it("drops pending ids whose variant no longer exists", async () => {
    const { req, context } = makeReq([[variant("v1", 10)], [variant("v1", 10)]]);
    await run({
      data: { _status: "published", _abPendingPercentages: { v1: 30, ghost: 40 } },
      originalDoc: { id: "p1" },
      req,
      operation: "update",
    });
    expect(context[AB_PENDING_CONTEXT_KEY]).toHaveLength(1);
  });

  it("accepts a total of exactly 99", async () => {
    const { req, context } = makeReq([
      [variant("v1", 10), variant("v2", 9)],
      [variant("v1", 10), variant("v2", 9)],
    ]);
    await run({
      data: { _status: "published", _abPendingPercentages: { v1: 90 } },
      originalDoc: { id: "p1" },
      req,
      operation: "update",
    });
    expect(context[AB_PENDING_CONTEXT_KEY]).toHaveLength(1);
  });

  it("rejects a total above 99 before writing anything", async () => {
    const { req, context } = makeReq([
      [variant("v1", 10), variant("v2", 10)],
      [variant("v1", 10), variant("v2", 10)],
    ]);
    await expect(
      run({
        data: { _status: "published", _abPendingPercentages: { v1: 90 } },
        originalDoc: { id: "p1" },
        req,
        operation: "update",
      })
    ).rejects.toMatchObject({
      name: "ValidationError",
      data: { errors: [{ message: expect.stringMatching(/100%/) }] },
    });
    expect(context[AB_PENDING_CONTEXT_KEY]).toBeUndefined();
  });

  it("validates a directly saved variant against its siblings' draft percentages", async () => {
    const { req, find } = makeReq([[variant("s1", 50)]]);
    await run({
      data: { _abVariantOf: "p1", _abPassPercentage: 49 },
      originalDoc: { id: "v1", _abVariantOf: "p1" },
      req,
      operation: "update",
    });
    expect(find.mock.calls[0][0]).toMatchObject({ draft: true });
  });

  it("rejects a directly saved variant that pushes the total above 99", async () => {
    const { req } = makeReq([[variant("s1", 50)]]);
    await expect(
      run({
        data: { _abVariantOf: "p1", _abPassPercentage: 50 },
        originalDoc: { id: "v1", _abVariantOf: "p1" },
        req,
        operation: "update",
      })
    ).rejects.toMatchObject({
      name: "ValidationError",
      data: { errors: [{ message: expect.stringMatching(/49%/) }] },
    });
  });
});
