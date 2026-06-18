import type { Config } from "payload";
import { afterEach, describe, expect, it, vi } from "vitest";
import { schedulePublicationPlugin } from "../src/plugin";

const incoming = { collections: [], globals: [], endpoints: [] } as unknown as Config;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("schedulePublicationPlugin validation", () => {
  it("disables (returns config unchanged) + warns when secret empty", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = schedulePublicationPlugin({ secret: "" } as never)(incoming);
    expect(result).toBe(incoming);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("secret"));
  });

  it("disables (returns config unchanged) + warns when secret missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = schedulePublicationPlugin({} as never)(incoming);
    expect(result).toBe(incoming);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("secret"));
  });
});
