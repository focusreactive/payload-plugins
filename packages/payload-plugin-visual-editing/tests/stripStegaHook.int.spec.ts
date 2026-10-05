import { vercelStegaCombine, vercelStegaDecode } from "@vercel/stega";
import { describe, expect, it } from "vitest";

import { createStripStegaHook } from "../src/internal/stripStegaHook";

const stega = (text: string, path: string) =>
  vercelStegaCombine(text, { origin: "test", href: "https://example.com", path }, false);

const run = (data: unknown) => {
  const hook = createStripStegaHook();
  return hook({ data } as Parameters<typeof hook>[0]);
};

describe("createStripStegaHook", () => {
  it("strips stega from top-level strings, leaving visible text intact", () => {
    const dirty = stega("Hello world", "title");
    expect(vercelStegaDecode(dirty)).toMatchObject({ path: "title" });

    const result = run({ title: dirty }) as { title: string };

    expect(result.title).toBe("Hello world");
    expect(vercelStegaDecode(result.title)).toBeUndefined();
  });

  it("passes clean strings through unchanged", () => {
    const result = run({ title: "Already clean" }) as { title: string };
    expect(result.title).toBe("Already clean");
  });

  it("walks nested objects and arrays (blocks / array rows)", () => {
    const data = {
      title: stega("Page title", "title"),
      layout: [
        { blockType: "hero", heading: stega("Hero heading", "layout.0.heading") },
        {
          blockType: "features",
          items: [{ label: stega("Feature one", "layout.1.items.0.label") }],
        },
      ],
    };

    const result = run(data) as typeof data;

    expect(result.title).toBe("Page title");
    expect((result.layout[0] as { heading: string }).heading).toBe("Hero heading");
    const nestedLabel = (result.layout[1] as { items: { label: string }[] }).items[0]!.label;
    expect(nestedLabel).toBe("Feature one");
    expect(vercelStegaDecode(nestedLabel)).toBeUndefined();
  });

  it("leaves non-string values untouched", () => {
    const data = { count: 42, enabled: true, ratio: 1.5, missing: null };
    const result = run(data) as typeof data;
    expect(result).toEqual(data);
  });

  it("is idempotent on already-clean data", () => {
    const data = { title: "Clean", nested: { body: "Also clean" } };
    const result = run(data) as typeof data;
    expect(result).toEqual(data);
  });
});
