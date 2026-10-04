import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Plan §5.12: zero serious/critical axe violations on the key templates at desktop and mobile. */
const PAGES = [
  "/",
  "/what-we-do/build-engineering",
  "/sectors/automotive",
  "/blog",
  "/contact",
  "/resources/events",
];

for (const width of [1440, 375]) {
  test.describe(`axe @ ${width}px`, () => {
    test.use({ viewport: { height: 900, width } });

    for (const path of PAGES) {
      test(path, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        const blocking = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical"
        );
        expect(
          blocking.map(
            (v) =>
              `${v.id}: ${v.nodes
                .slice(0, 3)
                .map((n) => n.target.join(" "))
                .join(" | ")}`
          )
        ).toEqual([]);
      });
    }

    test("a post", async ({ page, request }) => {
      const feed = await (await request.get("/feeds/all.atom.xml")).text();
      const link = /<link href="[^"]*?(\/blog\/[^"]+)" rel="alternate"\/>\s*<id>/u.exec(feed)?.[1];
      test.skip(!link, "no posts seeded");
      await page.goto(link!);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      );
      expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
    });
  });
}
