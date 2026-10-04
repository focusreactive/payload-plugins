import { expect, test } from "@playwright/test";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// The seed's full map (git-ignored) when present, otherwise the committed extras.
const dir = path.resolve(import.meta.dirname, "../../src/lib/redirects");
const file = ["legacy.local.json", "legacy.json"]
  .map((name) => path.join(dir, name))
  .find((candidate) => existsSync(candidate))!;
const legacy: unknown = JSON.parse(readFileSync(file, "utf-8"));

/**
 * Plan §5.4: old addresses answer 308 and land on a page that renders. Samples up to 25 entries
 * across the shapes in the generated map (article shapes, news, marketing .html, author pages).
 */
const entries = Object.entries(legacy as Record<string, string>);

const shapes: [string, RegExp][] = [
  ["article with year", /^\/articles\/\d{4}\/[^/]+$/u],
  ["article .html", /^\/articles\/\d{4}\/[^/]+\.html$/u],
  ["article without year", /^\/articles\/[^/]+$/u],
  ["news", /^\/news\/[^/]+\.html$/u],
  ["author", /^\/author\/[^/]+\.html$/u],
  ["marketing .html", /^\/[^/]+\.html$/u],
];

function sample(): [string, string][] {
  const picked = new Map<string, string>();
  for (const [, pattern] of shapes) {
    for (const [from, to] of entries.filter(([key]) => pattern.test(key)).slice(0, 5)) {
      picked.set(from, to);
    }
  }
  return [...picked.entries()].slice(0, 25);
}

test.describe("legacy URLs (308 → 200)", () => {
  for (const [from, to] of sample()) {
    test(`${from} → ${to}`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status()).toBe(308);
      expect(new URL(response.headers().location ?? "", "http://x").pathname).toBe(to);
      const target = await request.get(to);
      expect(target.status()).toBe(200);
    });
  }

  test("query strings survive the redirect", async ({ request }) => {
    const response = await request.get("/index.html?utm_source=e2e", { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toContain("utm_source=e2e");
  });
});
