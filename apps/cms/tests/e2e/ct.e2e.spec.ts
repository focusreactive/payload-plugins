import { expect, test } from "@playwright/test";

import { IA } from "../../src/lib/seed/ct/data/ia";

/**
 * T13 verification (plan §7, §9): every page of the new IA renders with one h1, the blog and its
 * author pages render, DE/JA are switched on, and the SEO/AI endpoints list the seeded content.
 * Legacy redirects, feeds, cookies and axe live in ct-redirects / ct-privacy / ct-a11y.
 */

async function expectOneH1(page: import("@playwright/test").Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), path).toBe(200);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).not.toBeEmpty();
}

test.describe("IA pages (§7) → 200 + h1", () => {
  for (const entry of IA) {
    test(entry.path, async ({ page }) => {
      await expectOneH1(page, entry.path);
    });
  }
});

test.describe("blog", () => {
  test("listing, a post and its author page", async ({ page, request }) => {
    await expectOneH1(page, "/blog");

    const feed = await (await request.get("/feeds/all.atom.xml")).text();
    const post = /<link href="[^"]*?(\/blog\/[^"]+)" rel="alternate"\/>\s*<id>/u.exec(feed)?.[1];
    test.skip(!post, "no posts seeded");
    await expectOneH1(page, post!);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    const author = /<loc>[^<]*?(\/blog\/author\/[^<]+)<\/loc>/u.exec(sitemap)?.[1];
    expect(author, "sitemap lists author pages").toBeTruthy();
    await expectOneH1(page, author!);
  });

  test("the scheduled demo post is not public yet", async ({ request }) => {
    const response = await request.get("/blog/scheduled-news-demo");
    expect(response.status()).toBe(404);
  });
});

test.describe("languages", () => {
  for (const locale of ["de", "ja"]) {
    test(`/${locale} renders with lang=${locale}`, async ({ page }) => {
      const response = await page.goto(`/${locale}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
    });
  }
});

test.describe("SEO and AI search", () => {
  test("robots.txt allows AI agents and points at the sitemap", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/User-Agent: GPTBot/iu);
    expect(robots).toMatch(/Sitemap: \S+\/sitemap\.xml/iu);
  });

  test("sitemap has every IA page with hreflang alternates", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const entry of IA.filter((item) => item.path !== "/")) {
      expect(sitemap, entry.path).toContain(`${entry.path}</loc>`);
    }
    expect(sitemap).toContain('hreflang="de"');
  });

  test("llms.txt lists the seeded articles", async ({ request }) => {
    const response = await request.get("/llms.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toMatch(/\/blog\/[a-z0-9-]+/u);
    expect(body).not.toContain("scheduled-news-demo");
  });
});
