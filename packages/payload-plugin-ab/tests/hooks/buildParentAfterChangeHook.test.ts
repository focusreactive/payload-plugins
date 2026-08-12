import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildParentAfterChangeHook } from "../../src/hooks/buildParentAfterChangeHook";
import { AB_CASCADE_CONTEXT_KEY, AB_PENDING_CONTEXT_KEY } from "../../src/constants";
import type { AbTestingPluginConfig, CollectionABConfig } from "../../src/types/config";

const applyVariantPercentage = vi.fn().mockResolvedValue(undefined);
const recomputeManifestForParent = vi.fn().mockResolvedValue(undefined);
const ensureExperimentRecords = vi.fn().mockResolvedValue(undefined);

vi.mock("../../src/utils/applyVariantPercentage", () => ({
  applyVariantPercentage: (...args: unknown[]) => applyVariantPercentage(...args),
}));
vi.mock("../../src/utils/recomputeManifest", () => ({
  recomputeManifestForParent: (...args: unknown[]) => recomputeManifestForParent(...args),
}));
vi.mock("../../src/hooks/ensureExperimentRecords", () => ({
  ensureExperimentRecords: (...args: unknown[]) => ensureExperimentRecords(...args),
}));

const abConfig: CollectionABConfig = { generatePath: () => null };
const pluginConfig = {
  collections: { pages: abConfig },
  storage: {} as never,
} as AbTestingPluginConfig;
const hook = buildParentAfterChangeHook("pages", abConfig, pluginConfig);

const run = (args: Record<string, unknown>) =>
  (hook as unknown as (a: Record<string, unknown>) => Promise<unknown>)(args);

const entries = [
  { variantId: "v1", desired: 30, draftPercentage: 10, publishedPercentage: 10, isDirty: false },
];

function makeReq(context: Record<string, unknown> = {}) {
  return { payload: {}, context } as never;
}

describe("buildParentAfterChangeHook", () => {
  beforeEach(() => {
    applyVariantPercentage.mockClear();
    recomputeManifestForParent.mockClear();
    ensureExperimentRecords.mockClear();
  });

  it("does nothing while a parent-driven cascade is running", async () => {
    const req = makeReq({ [AB_CASCADE_CONTEXT_KEY]: true, [AB_PENDING_CONTEXT_KEY]: entries });
    await run({ doc: { id: "p1", _status: "published" }, req });
    expect(applyVariantPercentage).not.toHaveBeenCalled();
    expect(recomputeManifestForParent).not.toHaveBeenCalled();
  });

  it("applies the plan as drafts and skips the manifest when the original is saved as a draft", async () => {
    const req = makeReq({ [AB_PENDING_CONTEXT_KEY]: entries });
    await run({ doc: { id: "p1", _status: "draft" }, req });
    expect(applyVariantPercentage).toHaveBeenCalledTimes(1);
    expect(applyVariantPercentage.mock.calls[0][0]).toMatchObject({ isPublish: false });
    expect(recomputeManifestForParent).not.toHaveBeenCalled();
  });

  it("applies the plan and recomputes the manifest once on publish", async () => {
    const req = makeReq({ [AB_PENDING_CONTEXT_KEY]: entries });
    await run({ doc: { id: "p1", _status: "published" }, req });
    expect(applyVariantPercentage.mock.calls[0][0]).toMatchObject({ isPublish: true });
    expect(recomputeManifestForParent).toHaveBeenCalledTimes(1);
    expect(ensureExperimentRecords).toHaveBeenCalledTimes(1);
  });

  it("clears both context keys so they cannot leak into a later operation", async () => {
    const context: Record<string, unknown> = { [AB_PENDING_CONTEXT_KEY]: entries };
    await run({ doc: { id: "p1", _status: "published" }, req: makeReq(context) });
    expect(context[AB_PENDING_CONTEXT_KEY]).toBeUndefined();
    expect(context[AB_CASCADE_CONTEXT_KEY]).toBeUndefined();
  });

  it("propagates a write failure and still clears the cascade flag", async () => {
    applyVariantPercentage.mockRejectedValueOnce(new Error("variant vanished"));
    const context: Record<string, unknown> = { [AB_PENDING_CONTEXT_KEY]: entries };
    await expect(
      run({ doc: { id: "p1", _status: "published" }, req: makeReq(context) })
    ).rejects.toThrow("variant vanished");
    expect(context[AB_CASCADE_CONTEXT_KEY]).toBeUndefined();
  });

  it("recomputes the parent manifest when a variant is published directly", async () => {
    await run({ doc: { id: "v1", _status: "published", _abVariantOf: "p1" }, req: makeReq() });
    expect(recomputeManifestForParent).toHaveBeenCalledTimes(1);
    expect(recomputeManifestForParent.mock.calls[0][0]).toBe("p1");
  });

  it("ignores a variant saved as a draft", async () => {
    await run({ doc: { id: "v1", _status: "draft", _abVariantOf: "p1" }, req: makeReq() });
    expect(recomputeManifestForParent).not.toHaveBeenCalled();
  });
});
