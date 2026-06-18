import type { Config } from "payload";
import { afterEach, describe, expect, it, vi } from "vitest";
import { abTestingPlugin } from "../src/plugin";
import { vercelEdgeAdapter } from "../src/adapters/vercelEdge";

const incoming = { collections: [] } as unknown as Config;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("abTestingPlugin config validation", () => {
  it("disables + warns when storage missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = abTestingPlugin({ collections: { posts: {} } } as never)(incoming);
    expect(result).toBe(incoming);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"storage"'));
  });

  it("disables + warns when collections empty", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = abTestingPlugin({ storage: {}, collections: {} } as never)(incoming);
    expect(result).toBe(incoming);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"collections"'));
  });

  it("does NOT warn when enabled is false (silent opt-out)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = abTestingPlugin({ enabled: false } as never)(incoming);
    expect(result).toBe(incoming);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("vercelEdgeAdapter validation", () => {
  it("warns when env-derived fields are empty", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vercelEdgeAdapter({ configID: "", configURL: "", vercelRestAPIAccessToken: "" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("vercelEdgeAdapter"));
  });
});
