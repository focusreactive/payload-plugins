import { vercelStegaCombine, vercelStegaDecode } from "@vercel/stega";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

import { createStripStegaHook } from "../../src/server/hooks/stripStegaHook";

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

  it("cleans the data it was given in place", () => {
    const hero = { heading: stega("Hero heading", "layout.0.heading") };
    const data = { layout: [hero], title: stega("Page title", "title") };

    const result = run(data);

    expect(result).toBe(data);
    expect(data.layout[0]).toBe(hero);
    expect(data).toEqual({ layout: [{ heading: "Hero heading" }], title: "Page title" });
  });

  it("cleans the strings of a class instance", () => {
    class Seo {
      title = stega("Page title", "seo.title");
    }
    const seo = new Seo();

    const result = run({ seo }) as { seo: Seo };

    expect(result.seo).toBe(seo);
    expect(seo.title).toBe("Page title");
  });

  it("cleans an object and an array made in another realm", () => {
    const data = runInNewContext("({ tags: [title], title })", {
      title: stega("Page title", "title"),
    });

    run(data);

    expect(data.title).toBe("Page title");
    expect(data.tags[0]).toBe("Page title");
  });

  it("leaves the path meta of a draft read as it is", () => {
    const meta = { path: stega("title", "title") };

    const result = run({ _meta: meta }) as { _meta: typeof meta };

    expect(result._meta).toBe(meta);
    expect(vercelStegaDecode(result._meta.path)).toBeDefined();
  });
});
