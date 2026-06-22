/**
 * Integration coverage against the real yoastseo library (no vi.mock).
 * Verifies runAnalysis resolves research names and populates CheckResult.data
 * for every visualization-bearing check.
 */
import { describe, it, expect } from "vitest";
import { runAnalysis } from "../../src/engine/runAnalysis";
import type { AnalysisInput, CheckResult } from "../../src/engine/types/analysis";

// Rich content designed to trigger every visualization-bearing check:
// - keyphrase repeated multiple times for density + distribution
// - <img> tags: one with keyphrase in alt, one without
// - internal + external links, one nofollow
// - a very long paragraph (>150 words) to trigger textParagraphTooLong
// - long sentences (>20 words) for textSentenceLength
// - multiple subheadings
// - transition words (however, therefore, furthermore) for textTransitionWords
const contentHtml = `
<h1>Best Running Shoes for Every Runner</h1>

<p>Running shoes are essential for any serious runner who wants to protect their feet and improve their performance on the track or trail. The best running shoes provide cushioning, support, and durability that every athlete needs to succeed during long training sessions and race day events.</p>

<h2>Why Running Shoes Matter</h2>

<p>However, not all running shoes are created equal, and therefore it is important to choose the right pair. Furthermore, you should consider your gait, arch type, and the surface you run on when selecting running shoes. Moreover, the fit and weight of the shoe will also affect your comfort and speed.</p>

<h2>Top Features to Look For</h2>

<p>Running shoes with excellent cushioning help absorb the impact of each stride. In addition, good running shoes offer breathable uppers that keep your feet cool and dry throughout your workout. Nevertheless, some runners prefer a more minimalist approach to running shoes. Consequently, the market now offers a wide variety of styles and technologies to suit every type of runner, from casual joggers to elite marathoners.</p>

<p>When you lace up your running shoes each morning, you begin a ritual that connects you to millions of other runners around the world who share your passion for movement, fitness, health, and the simple joy of putting one foot in front of the other on the open road or trail, feeling the wind against your face and the ground beneath your feet, making progress toward your goals one step at a time, building strength and endurance with every mile that passes beneath your running shoes, experiencing the runner's high that only comes after sustained effort and dedication to the sport of running across varied terrain and in all weather conditions regardless of obstacles, and no matter how tired your legs may feel after a long and demanding week of hard training, the steady rhythm of your running shoes striking the pavement reminds you exactly why you first started, pushing you forward through every steep hill, every biting headwind, and every quiet moment of doubt until the distant finish line finally comes into clear view.</p>

<h2>Our Recommendations</h2>

<p>These running shoes are our top picks this season. Running shoes from leading brands like Brooks, ASICS, and Nike dominate the market. However, newer brands also produce excellent running shoes that rival the established names.</p>

<h2>Images of Running Shoes</h2>

<p>Below are some examples of popular running shoes currently available.</p>

<img src="/images/running-shoes-trail.jpg" alt="running shoes on a trail" />
<img src="/images/sneakers-generic.jpg" alt="colorful athletic sneakers" />

<h2>Useful Links</h2>

<p>For more information about running shoes, visit our <a href="/guides/how-to-choose-running-shoes">how to choose running shoes</a> guide. You can also check out this <a href="https://www.runnersworld.com" rel="nofollow">Runner's World review of running shoes</a> for independent recommendations. Additionally, our <a href="/collections/running-shoes">full collection of running shoes</a> is available online.</p>

<h2>Conclusion</h2>

<p>In conclusion, investing in quality running shoes is one of the best decisions any runner can make. Therefore, take the time to find the right pair of running shoes for your specific needs and running style.</p>
`.trim();

const input: AnalysisInput = {
  title: "Best Running Shoes for Every Runner",
  slug: "running-shoes",
  description:
    "Discover the best running shoes for every type of runner. Expert picks, comparisons, and buying guides to help you find your perfect pair of running shoes.",
  contentHtml,
  keyphrase: "running shoes",
  locale: "en_US",
  site: { name: "RunShop", baseUrl: "https://runshop.com" },
  has: {
    seoTitle: true,
    metaDescription: true,
    slug: true,
    content: true,
  },
};

describe("runAnalysis integration (real yoastseo — no mocks)", () => {
  it("runs without throwing against the real EnglishResearcher", () => {
    expect(() => runAnalysis(input)).not.toThrow();
  });

  it("populates data for visualization-bearing checks", () => {
    const result = runAnalysis(input);

    const allChecks: CheckResult[] = [
      ...result.keyphrase.checks,
      ...result.onPage.checks,
      ...result.readability.checks,
    ];

    // Build id -> data map and log it
    const dataMap: Record<string, Record<string, unknown> | undefined> = {};
    for (const check of allChecks) {
      dataMap[check.id] = check.data;
    }

    console.log("\n=== id -> data map (real yoastseo research resolution) ===");
    for (const [id, data] of Object.entries(dataMap)) {
      console.log(`  ${id}:`, data === undefined ? "undefined (no data)" : JSON.stringify(data));
    }
    console.log("=== end id -> data map ===\n");

    const checkIds = new Set(allChecks.map((c) => c.id));

    // ── Hard assertions: these MUST resolve if present ──────────────────────

    // keyphraseDensity
    if (checkIds.has("keyphraseDensity")) {
      expect(dataMap["keyphraseDensity"], "keyphraseDensity.data must be defined").toBeDefined();
      expect(typeof (dataMap["keyphraseDensity"] as Record<string, unknown>)?.densityPct).toBe(
        "number"
      );
    }

    // metaDescriptionLength — uses our own heuristic via paper.getDescription()
    if (checkIds.has("metaDescriptionLength")) {
      expect(
        dataMap["metaDescriptionLength"],
        "metaDescriptionLength.data must be defined"
      ).toBeDefined();
      expect(typeof (dataMap["metaDescriptionLength"] as Record<string, unknown>)?.chars).toBe(
        "number"
      );
    }

    // titleWidth — our own heuristic (character count * px/char), not yoastseo research
    if (checkIds.has("titleWidth")) {
      expect(dataMap["titleWidth"], "titleWidth.data must be defined").toBeDefined();
      const px = (dataMap["titleWidth"] as Record<string, unknown>)?.px;
      expect(typeof px).toBe("number");
      expect(px as number).toBeGreaterThan(0);
    }

    // textLength — wordCountInText research
    if (checkIds.has("textLength")) {
      expect(dataMap["textLength"], "textLength.data must be defined").toBeDefined();
      expect(typeof (dataMap["textLength"] as Record<string, unknown>)?.words).toBe("number");
    }

    if (checkIds.has("keyphraseDistribution")) {
      expect(
        Array.isArray((dataMap["keyphraseDistribution"] as Record<string, unknown>)?.positions)
      ).toBe(true);
    }
    if (checkIds.has("fleschReadingEase")) {
      expect(typeof (dataMap["fleschReadingEase"] as Record<string, unknown>)?.score).toBe(
        "number"
      );
    }

    // ── Soft assertions: present check ids with expected data must not be undefined ──

    // Checks that should have data if the research resolves correctly
    const dataExpectedIds = [
      "imageKeyphrase",
      "externalLinks",
      "internalLinks",
      "textTransitionWords",
      "textSentenceLength",
      "textParagraphTooLong",
      "keyphraseLength",
      "subheadingsKeyword",
      "passiveVoice",
      "images",
    ];

    const silentFailures: string[] = [];
    const resolved: string[] = [];
    const notEmitted: string[] = [];

    for (const id of dataExpectedIds) {
      if (!checkIds.has(id)) {
        notEmitted.push(id);
        continue;
      }
      if (dataMap[id] === undefined) {
        silentFailures.push(id);
      } else {
        resolved.push(id);
      }
    }

    console.log("Resolved (data defined):", resolved);
    console.log("Not emitted by assessor:", notEmitted);
    console.log("Silent failures (present but data=undefined):", silentFailures);

    // Fail if any present check that we expect data for returned undefined
    expect(
      silentFailures,
      `Silent-failure bug: these checks are emitted by yoastseo assessor but extractCheckData returned undefined: ${silentFailures.join(", ")}`
    ).toEqual([]);
  });
});
