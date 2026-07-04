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
    let result: Config | Promise<Config> | undefined;
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

  it("drops a collection missing extractContentPath and warns (keeps valid ones)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const incomingWithCols = {
      collections: [{ slug: "page", fields: [] }],
    } as unknown as Config;
    const result = seoPlugin({
      collections: [
        { slug: "page", extractContentPath: "@/page#default" },
        { slug: "bad" } as never,
      ],
    } as unknown as SeoPluginConfig)(incomingWithCols);
    expect(result).not.toBe(incomingWithCols);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"bad"'));
  });

  it("no-ops when no collection has a valid extractContentPath", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = seoPlugin({
      collections: [{ slug: "bad" } as never],
    } as unknown as SeoPluginConfig)(incoming);
    expect(result).toBe(incoming);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("valid extractContentPath"));
  });
});
