import { expect, test } from "@playwright/test";

// The frontend example of spec section 10.3 (`dev/app/(frontend)`), read as an anonymous visitor
// would: through plain HTTP, with no admin session. The paths are the dev seed's.

test("/blog is 200 with Blog Home", async ({ page }) => {
  const response = await page.goto("/blog");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Blog Home" })).toBeVisible();
  // The nav links a folder only when it has a root page: Blog has one, Archive has none.
  const nav = page.getByRole("navigation", { name: "Site" });
  await expect(nav.getByRole("link", { exact: true, name: "Blog" })).toBeVisible();
  await expect(nav.getByText("Archive", { exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { exact: true, name: "Archive" })).toHaveCount(0);
});

test("/about/contact redirects to /company/contact", async ({ page, request }) => {
  const response = await request.get("/about/contact", { maxRedirects: 0 });

  expect(response.status()).toBe(308);
  expect(new URL(response.headers().location, "http://localhost").pathname).toBe(
    "/company/contact"
  );
  await page.goto("/about/contact");
  await expect(page).toHaveURL(/\/company\/contact$/u);
  await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeVisible();
});

test("/Company/Contact redirects to the lowercase URL", async ({ request }) => {
  const response = await request.get("/Company/Contact", { maxRedirects: 0 });

  expect(response.status()).toBe(308);
  expect(new URL(response.headers().location, "http://localhost").pathname).toBe(
    "/company/contact"
  );
});

test("/empty is 404", async ({ request }) => {
  // A folder with no root page is not a page.
  expect((await request.get("/empty")).status()).toBe(404);
});

test("a never-published page is 404", async ({ request }) => {
  // Press Kit is saved as a draft and has never been published.
  expect((await request.get("/company/press-kit")).status()).toBe(404);
});

test("/sitemap.xml lists /company/contact and not the draft", async ({ request }) => {
  const response = await request.get("/sitemap.xml");

  expect(response.status()).toBe(200);
  const sitemap = await response.text();
  expect(sitemap).toContain("/company/contact</loc>");
  expect(sitemap).toContain("/de/unternehmen/kontakt</loc>");
  expect(sitemap).not.toContain("press-kit");
});

test("the German path resolves under its prefix", async ({ page }) => {
  const response = await page.goto("/de/unternehmen/kontakt");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Kontakt" })).toBeVisible();
});
