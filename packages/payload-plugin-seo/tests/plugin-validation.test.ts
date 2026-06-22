import type { Config } from "payload";
import { afterEach, describe, expect, it, vi } from "vitest";
import { seoPlugin } from "../src/plugin";
import type { SeoPluginConfig } from "../src/types/config";

const incoming = { collections: [] } as unknown as Config;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("seoPlugin config validation", () => {
  it("warns + returns incoming (no throw) when collections empty", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let result: Config | undefined;
    expect(() => {
      result = seoPlugin({ collections: [] } as unknown as SeoPluginConfig)(incoming);
    }).not.toThrow();
    expect(result).toBe(incoming);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("at least one collection slug"));
  });

  it("does NOT warn when disabled flag is set (silent opt-out)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = seoPlugin({ disabled: true, collections: [] } as unknown as SeoPluginConfig)(
      incoming
    );
    expect(result).toBe(incoming);
    expect(warn).not.toHaveBeenCalled();
  });
});
