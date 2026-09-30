import { describe, expect, it } from "vitest";

import { defaultExcludeValues, isHash, isIsoDate, isSlug, isUrl } from "../src/excludeValues";

describe("isUrl", () => {
  it.each([
    "https://example.com",
    "http://example.com/path",
    "file:///tmp/file",
    "mailto:foo@bar.com",
    "tel:+1234567890",
    "data:image/png;base64,iVBORw0",
    // oxlint-disable-next-line no-script-url -- test fixture: must be excluded as a URL
    "javascript:void(0)",
    "//cdn.example.com/asset.png",
    "/relative/path",
    "/",
  ])("matches %s", (value) => {
    expect(isUrl(value)).toBe(true);
  });

  it.each(["hello", "80%", "state-of-the-art", "example.com", "#fragment"])(
    "rejects %s",
    (value) => {
      expect(isUrl(value)).toBe(false);
    }
  );
});

describe("isSlug", () => {
  it.each(["hello-world", "e-commerce", "state-of-the-art", "about-us", "2024-review", "co-op"])(
    "matches %s",
    (value) => {
      expect(isSlug(value)).toBe(true);
    }
  );

  it.each([
    "hello",
    "Hello-World",
    "hello world",
    "-hello",
    "hello-",
    "hello--world",
    "80%",
    "/relative",
  ])("rejects %s", (value) => {
    expect(isSlug(value)).toBe(false);
  });
});

describe("isHash", () => {
  it.each(["#", "#demo", "#section-1", "#1a", "#2 seed"])("matches %s", (value) => {
    expect(isHash(value)).toBe(true);
  });

  // `#<number>` is ranking text, not a URL fragment — stega must still apply.
  it.each(["#0", "#1", "#42", "#100", "#9999"])("rejects pure #number %s", (value) => {
    expect(isHash(value)).toBe(false);
  });

  it.each(["hello", "hello#world", "80%"])("rejects non-hash-prefixed %s", (value) => {
    expect(isHash(value)).toBe(false);
  });
});

describe("isIsoDate", () => {
  it.each([
    "2024-01-15",
    "2024-01-15T10:30:00",
    "2024-01-15T10:30:00.123",
    "2024-01-15T10:30:00Z",
    "2024-01-15T10:30:00.123Z",
    "2024-01-15T10:30:00+02:00",
    "2024-01-15T10:30:00-05:30",
    // Compact offset form (no colon) — also valid ISO 8601.
    "2024-01-15T10:30:00+0200",
    "2024-01-15T10:30:00.500-0530",
  ])("matches %s", (value) => {
    expect(isIsoDate(value)).toBe(true);
  });

  it.each(["2024", "2024-01", "24-01-15", "2024/01/15", "hello", "80%"])("rejects %s", (value) => {
    expect(isIsoDate(value)).toBe(false);
  });
});

describe("defaultExcludeValues", () => {
  it("includes all four built-in predicates", () => {
    expect(defaultExcludeValues).toHaveLength(4);
    expect(defaultExcludeValues).toContain(isUrl);
    expect(defaultExcludeValues).toContain(isSlug);
    expect(defaultExcludeValues).toContain(isHash);
    expect(defaultExcludeValues).toContain(isIsoDate);
  });

  const matches = (value: string) => defaultExcludeValues.some((p) => p(value));

  it.each(["https://example.com", "hello-world", "#section", "2024-01-15"])(
    "catches %s",
    (value) => {
      expect(matches(value)).toBe(true);
    }
  );

  // The original bug: `"80%"` must NOT be auto-skipped. V8's Date.parse accepts it
  // (parses as year 1980) which was triggering @vercel/stega's internal skip.
  it.each(["80%", "Career Advancement", "hello", "#1", "2024"])("lets %s through", (value) => {
    expect(matches(value)).toBe(false);
  });
});
