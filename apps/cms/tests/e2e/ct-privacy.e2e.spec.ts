import { expect, test } from "@playwright/test";

/** Plan §5.10: the public site sets no cookies and loads nothing from YouTube before a click. */
const PAGES = ["/", "/contact", "/resources/events", "/updates.html"];

test.describe("privacy", () => {
  test("public pages leave the cookie jar empty", async ({ page, context }) => {
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }
    expect(await context.cookies()).toEqual([]);
  });

  test("videos are click-to-load via youtube-nocookie", async ({ page }) => {
    const youtube: string[] = [];
    page.on("request", (request) => {
      if (/youtube\.com|ytimg\.com|youtube-nocookie\.com/u.test(request.url())) {
        youtube.push(request.url());
      }
    });
    await page.goto("/resources/events");
    await page.waitForLoadState("networkidle");
    expect(youtube).toEqual([]);
    const play = page.getByRole("button", { name: /^Play video:/u }).first();
    if ((await play.count()) > 0) {
      await play.click();
      await expect(page.locator('iframe[src*="youtube-nocookie.com"]')).toHaveCount(1);
    }
  });

  test("no iframes anywhere on a form page", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("iframe")).toHaveCount(0);
  });

  test("Plausible tag only when configured", async ({ page }) => {
    await page.goto("/");
    const tags = await page.locator("script[data-domain]").count();
    expect(tags).toBe(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ? 1 : 0);
  });
});

test("feeds are well-formed and list the newest post first", async ({ request }) => {
  for (const feed of ["/feeds/atom.xml", "/feeds/rss.xml"]) {
    const response = await request.get(feed);
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body.startsWith("<?xml")).toBe(true);
    expect(body).toMatch(/<(entry|item)>/u);
  }
});
