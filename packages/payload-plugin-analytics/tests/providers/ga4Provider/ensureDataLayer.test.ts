import { afterEach, describe, expect, it } from "vitest";
import { ensureDataLayer } from "../../../src/providers/ga4Provider/ensureDataLayer";

afterEach(() => {
  delete window.dataLayer;
  delete window.gtag;
});

describe("ensureDataLayer", () => {
  it("installs dataLayer + queueing gtag stub when neither exists", () => {
    ensureDataLayer();
    expect(Array.isArray(window.dataLayer)).toBe(true);
    expect(typeof window.gtag).toBe("function");
  });

  it("queueing gtag pushes to dataLayer", () => {
    ensureDataLayer();
    window.gtag!("event", "test", { foo: 1 });
    expect(window.dataLayer).toHaveLength(1);
    const [first] = window.dataLayer as unknown[];
    expect((first as IArguments)[0]).toBe("event");
  });

  it("is idempotent — does not replace an existing real gtag", () => {
    const realGtag = function realGtag() {} as Window["gtag"];
    window.gtag = realGtag;
    window.dataLayer = [];
    ensureDataLayer();
    expect(window.gtag).toBe(realGtag);
  });

  it("preserves an existing dataLayer", () => {
    const existing: unknown[] = [{ marker: true }];
    window.dataLayer = existing;
    ensureDataLayer();
    expect(window.dataLayer).toBe(existing);
  });
});
