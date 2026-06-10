/**
 * Drives the real deriveSeo (no yoastseo mocking) to verify empty-keyphrase
 * exclusion: with a populated keyphrase the full seoChecks are scored; with an
 * empty/whitespace keyphrase only on-page checks contribute to the ring.
 */
import { describe, expect, it } from "vitest";
import { CHECK_IDS } from "../../../../src/constants/checkIds";
import { buildPaper } from "../../../../src/engine/buildPaper";
import { deriveSeo } from "../../../../src/engine/runAnalysis/services/derive-seo";
import { scoreToStatus, statusToRing } from "../../../../src/engine/scoreStatus";
import type { AnalysisInput } from "../../../../src/engine/types/analysis";

const contentHtml = `
<h1>Best Running Shoes for Every Runner</h1>

<p>Running shoes are essential for any serious runner who wants to protect their feet and improve their performance on the track or trail. The best running shoes provide cushioning, support, and durability that every athlete needs to succeed during long training sessions and race day events.</p>

<h2>Why Running Shoes Matter</h2>

<p>However, not all running shoes are created equal, and therefore it is important to choose the right pair. Furthermore, you should consider your gait, arch type, and the surface you run on when selecting running shoes. Moreover, the fit and weight of the shoe will also affect your comfort and speed.</p>

<h2>Top Features to Look For</h2>

<p>Running shoes with excellent cushioning help absorb the impact of each stride. In addition, good running shoes offer breathable uppers that keep your feet cool and dry throughout your workout. Nevertheless, some runners prefer a more minimalist approach to running shoes. Consequently, the market now offers a wide variety of styles and technologies to suit every type of runner, from casual joggers to elite marathoners.</p>

<p>When you lace up your running shoes each morning, you begin a ritual that connects you to millions of other runners around the world who share your passion for movement, fitness, health, and the simple joy of putting one foot in front of the other on the open road or trail, feeling the wind against your face and the ground beneath your feet, making progress toward your goals one step at a time, building strength and endurance with every mile that passes beneath your running shoes.</p>

<h2>Useful Links</h2>

<p>For more information about running shoes, visit our <a href="/guides/how-to-choose-running-shoes">how to choose running shoes</a> guide. You can also check out this <a href="https://www.runnersworld.com" rel="nofollow">Runner's World review of running shoes</a>.</p>

<img src="/images/running-shoes-trail.jpg" alt="running shoes on a trail" />
`.trim();

function makeInput(keyphrase: string): AnalysisInput {
  return {
    title: "Best Running Shoes for Every Runner",
    slug: "running-shoes",
    description: "Discover the best running shoes for every type of runner. Expert picks, comparisons, and buying guides to help you find your perfect pair of running shoes.",
    contentHtml,
    keyphrase,
    locale: "en_US",
    site: { name: "RunShop", baseUrl: "https://runshop.com" },
    has: { seoTitle: true, metaDescription: true, slug: true, content: true },
  };
}

const KEYPHRASE_IDS = new Set<string>(CHECK_IDS.keyphrase);

describe("deriveSeo — populated keyphrase", () => {
  const keyphrase = "running shoes";
  const paper = buildPaper(makeInput(keyphrase));
  const result = deriveSeo(paper, keyphrase);

  it("emits keyphrase checks", () => {
    expect(result.keyphrase.checks.length).toBeGreaterThan(0);
  });

  it("only emits ids belonging to CHECK_IDS.keyphrase", () => {
    for (const check of result.keyphrase.checks) {
      expect(KEYPHRASE_IDS.has(check.id)).toBe(true);
    }
  });

  it("derives overall status from the overall ring score", () => {
    expect(result.overall.status).toBe(scoreToStatus(result.overall.seoScore / 10));
  });
});

describe("deriveSeo — empty keyphrase", () => {
  const keyphrase = "";
  const paper = buildPaper(makeInput(keyphrase));
  const result = deriveSeo(paper, keyphrase);

  it("returns no keyphrase checks", () => {
    expect(result.keyphrase.checks).toEqual([]);
  });

  it("reports a perfect, good keyphrase category", () => {
    expect(result.keyphrase.ringScore).toBe(100);
    expect(result.keyphrase.status).toBe("good");
  });

  it("does not leak keyphrase ids into the on-page checks", () => {
    for (const check of result.onPage.checks) {
      expect(KEYPHRASE_IDS.has(check.id)).toBe(false);
    }
  });

  it("scores the overall ring from on-page checks only", () => {
    expect(result.overall.seoScore).toBe(statusToRing(result.onPage.checks));
  });
});

describe("deriveSeo — whitespace keyphrase behaves like empty", () => {
  const keyphrase = "   ";
  const paper = buildPaper(makeInput(keyphrase));
  const result = deriveSeo(paper, keyphrase);

  it("returns no keyphrase checks", () => {
    expect(result.keyphrase.checks).toEqual([]);
  });

  it("reports a perfect, good keyphrase category", () => {
    expect(result.keyphrase.ringScore).toBe(100);
    expect(result.keyphrase.status).toBe("good");
  });

  it("does not leak keyphrase ids into the on-page checks", () => {
    for (const check of result.onPage.checks) {
      expect(KEYPHRASE_IDS.has(check.id)).toBe(false);
    }
  });

  it("scores the overall ring from on-page checks only", () => {
    expect(result.overall.seoScore).toBe(statusToRing(result.onPage.checks));
  });
});
