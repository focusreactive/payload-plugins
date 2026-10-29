import type { Browser, BrowserContext, Page } from "@playwright/test";

/** The password every seeded role user has (synthetic, dev app only). */
const seededPassword = "test";

/**
 * A browser context signed in as a seeded role user. The dev app's auto-login signs in the admin
 * for any request without a session, so the login sends the header that turns it off.
 */
export const signInAs = async (
  browser: Browser,
  baseURL: string,
  email: string
): Promise<{ context: BrowserContext; page: Page }> => {
  const context = await browser.newContext({ baseURL });
  const response = await context.request.post("/api/users/login", {
    data: { email, password: seededPassword },
    headers: { DisableAutologin: "true" },
  });
  if (!response.ok()) {
    throw new Error(`Signing in as ${email} failed with status ${response.status()}`);
  }

  return { context, page: await context.newPage() };
};
