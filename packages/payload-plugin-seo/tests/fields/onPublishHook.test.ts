import { describe, expect, it, vi } from "vitest";
import { makeGenerateOnPublishHook } from "../../src/fields/onPublishHook";

const generateForField = vi.hoisted(() => vi.fn());
vi.mock("../../src/server/generate/generateForField", () => ({
  generateForField: (...a: unknown[]) => generateForField(...a),
}));
const getPluginConfig = vi.hoisted(() => vi.fn());
vi.mock("../../src/config", () => ({ getPluginConfig: () => getPluginConfig() }));

function ctx(over: Record<string, unknown> = {}) {
  return {
    value: "",
    data: { _status: "published" },
    collection: { slug: "page" },
    req: {
      context: {},
      locale: "en",
      payload: { find: vi.fn(async () => ({ docs: [] })), logger: { error: vi.fn() } },
    },
    operation: "update",
    ...over,
  } as never;
}

describe("makeGenerateOnPublishHook", () => {
  const hook = makeGenerateOnPublishHook({ kind: "title", range: undefined });

  it("returns existing value untouched", async () => {
    getPluginConfig.mockReturnValue({
      generation: { apiKey: "k" },
      collections: [{ slug: "page", serverExtractContent: vi.fn() }],
    });
    expect(await hook(ctx({ value: "Existing" }))).toBe("Existing");
    expect(generateForField).not.toHaveBeenCalled();
  });

  it("no-ops when not publishing", async () => {
    getPluginConfig.mockReturnValue({
      generation: { apiKey: "k" },
      collections: [{ slug: "page", serverExtractContent: vi.fn(async () => []) }],
    });
    expect(await hook(ctx({ data: { _status: "draft" } }))).toBe("");
    expect(generateForField).not.toHaveBeenCalled();
  });

  it("no-ops when generation disabled (no key)", async () => {
    getPluginConfig.mockReturnValue({
      generation: {},
      collections: [{ slug: "page", serverExtractContent: vi.fn(async () => []) }],
    });
    delete process.env.OPENAI_API_KEY;
    expect(await hook(ctx())).toBe("");
    expect(generateForField).not.toHaveBeenCalled();
  });

  it("generates when empty + publishing + configured", async () => {
    const extractor = vi.fn(async () => []);
    getPluginConfig.mockReturnValue({
      generation: { apiKey: "k" },
      collections: [{ slug: "page", serverExtractContent: extractor }],
    });
    generateForField.mockResolvedValueOnce("Generated Title");
    expect(await hook(ctx())).toBe("Generated Title");
    expect(extractor).toHaveBeenCalledTimes(1);
  });

  it("falls back to original value on generation error", async () => {
    getPluginConfig.mockReturnValue({
      generation: { apiKey: "k" },
      collections: [{ slug: "page", serverExtractContent: vi.fn(async () => []) }],
    });
    generateForField.mockRejectedValueOnce(new Error("boom"));
    expect(await hook(ctx())).toBe("");
  });

  it("memoizes extracted content across hook calls sharing a request", async () => {
    const extractor = vi.fn(async () => []);
    getPluginConfig.mockReturnValue({
      generation: { apiKey: "k" },
      collections: [{ slug: "page", serverExtractContent: extractor }],
    });
    generateForField.mockResolvedValue("X");
    const shared = ctx();
    await hook(shared);
    await hook(shared);
    expect(extractor).toHaveBeenCalledTimes(1);
  });
});
