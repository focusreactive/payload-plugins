import { describe, expect, it } from "vitest";
import { LINK_SNIPPET_RADIUS } from "../../../src/constants";
import { findLinkCandidates } from "../../../src/server/links/findLinkCandidates";

const filler = "lorem ".repeat(LINK_SNIPPET_RADIUS);

const text =
  "We build sites on Payload CMS. A website needs fast pages. Payload   CMS has drafts, and headless setups scale.";

describe("findLinkCandidates", () => {
  it("matches whole words only, case-insensitively, across extra spaces", () => {
    const result = findLinkCandidates(text, [
      { collection: "posts", docId: "1", phrases: ["payload cms"] },
      { collection: "posts", docId: "2", phrases: ["web"] },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      collection: "posts",
      docId: "1",
      phrase: "payload cms",
      count: 2,
    });
  });

  it("keeps the best phrase per document", () => {
    const [best] = findLinkCandidates(text, [
      { collection: "page", docId: "7", phrases: ["headless", "payload cms"] },
    ]);
    expect(best.phrase).toBe("payload cms");
  });

  it("ranks by count, then by phrase length", () => {
    const result = findLinkCandidates(text, [
      { collection: "page", docId: "a", phrases: ["drafts"] },
      { collection: "page", docId: "b", phrases: ["payload cms"] },
      { collection: "page", docId: "c", phrases: ["fast pages"] },
    ]);
    expect(result.map((r) => r.docId)).toEqual(["b", "c", "a"]);
  });

  it("returns a snippet around the first match", () => {
    const [hit] = findLinkCandidates(`${filler}needs fast pages. Payload ${filler}`, [
      { collection: "page", docId: "c", phrases: ["fast pages"] },
    ]);
    expect(hit.snippet).toMatch(/^… (lorem )+needs fast pages\. Payload( lorem)+ …$/u);
    expect(hit.snippet.length).toBeLessThanOrEqual(
      "fast pages".length + 2 * (LINK_SNIPPET_RADIUS + "… ".length)
    );
  });

  it("ignores blank phrases and regex characters", () => {
    expect(
      findLinkCandidates("price is 5$ (net)", [
        { collection: "p", docId: "1", phrases: [" ", "5$ (net)"] },
      ])
    ).toHaveLength(1);
  });

  it("matches words in non-latin scripts", () => {
    expect(
      findLinkCandidates("Мы любим кофе и чай", [
        { collection: "p", docId: "1", phrases: ["кофе"] },
        { collection: "p", docId: "2", phrases: ["коф"] },
      ]).map((c) => c.docId)
    ).toEqual(["1"]);
  });

  it("matches regardless of accents and unicode normalization", () => {
    const sources = [
      { collection: "p", docId: "1", phrases: ["café".normalize("NFD")] },
      { collection: "p", docId: "2", phrases: ["Cafe"] },
    ];
    expect(findLinkCandidates("un café".normalize("NFC"), sources).map((c) => c.docId)).toEqual([
      "1",
      "2",
    ]);
  });

  it("treats combining marks as part of the word", () => {
    expect(findLinkCandidates("कि", [{ collection: "p", docId: "1", phrases: ["क"] }])).toEqual([]);
  });

  it("does not match a phrase across punctuation", () => {
    expect(
      findLinkCandidates("We use payload. CMS is next.", [
        { collection: "p", docId: "1", phrases: ["payload cms"] },
      ])
    ).toEqual([]);
  });

  it("keeps the input order on ties", () => {
    const result = findLinkCandidates("alpha bravo", [
      { collection: "p", docId: "b", phrases: ["bravo"] },
      { collection: "p", docId: "a", phrases: ["alpha"] },
    ]);
    expect(result.map((r) => r.docId)).toEqual(["b", "a"]);
  });

  it("cuts snippets on word boundaries without splitting surrogate pairs", () => {
    const [hit] = findLinkCandidates(`😀😀😀😀😀 ${filler}x three four`, [
      { collection: "p", docId: "1", phrases: ["x"] },
    ]);
    expect(hit.snippet).toMatch(/^… lorem .* x three four$/u);
    expect(hit.snippet).not.toMatch(/\p{Cs}/u);
  });

  it("counts every occurrence", () => {
    const [hit] = findLinkCandidates("cms, CMS and cms", [
      { collection: "p", docId: "1", phrases: ["cms"] },
    ]);
    expect(hit.count).toBe(3);
  });

  const matchedIn = (body: string, phrase: string) =>
    findLinkCandidates(body, [{ collection: "p", docId: "1", phrases: [phrase] }]).length;

  it("treats typographic and straight apostrophes alike", () => {
    expect(matchedIn("Don’t panic now", "don't panic")).toBe(1);
    expect(matchedIn("Don't panic now", "don’t panic")).toBe(1);
  });

  it("treats hyphens, dashes and spaces between words alike", () => {
    expect(matchedIn("an e-commerce site", "e commerce")).toBe(1);
    expect(matchedIn("an e commerce site", "e-commerce")).toBe(1);
    expect(matchedIn("an e–commerce site", "e-commerce")).toBe(1);
  });

  it("does not count overlapping matches of the same phrase", () => {
    const count = (body: string) =>
      findLinkCandidates(body, [{ collection: "p", docId: "1", phrases: ["a a"] }])[0]?.count;
    expect(count("a a a")).toBe(1);
    expect(count("a a a a")).toBe(2);
  });

  it("matches phrases that share their first word", () => {
    const result = findLinkCandidates("how to cook and how to bake", [
      { collection: "p", docId: "1", phrases: ["how to bake"] },
      { collection: "p", docId: "2", phrases: ["how to cook"] },
      { collection: "p", docId: "3", phrases: ["how to fly"] },
    ]);
    expect(result.map((r) => r.docId)).toEqual(["1", "2"]);
  });

  it.each([
    ["the start of the text", "Café-bar opens", ["cafe bar"], "Café-bar"],
    ["a trimmed text", "  \n cms  rocks", ["cms rocks"], "cms  rocks".replace(/\s+/gu, " ")],
    [
      "the middle of a long text",
      `${filler}we  use Payload\nCMS daily${filler}`,
      ["payload cms"],
      "Payload CMS",
    ],
  ])("points at the matched text within the snippet at %s", (_name, input, phrases, matched) => {
    const [hit] = findLinkCandidates(input, [{ collection: "p", docId: "1", phrases }]);
    expect(hit.snippet.slice(hit.snippetMatch.start, hit.snippetMatch.end)).toBe(matched);
  });

  it("keeps the snippet on the first match when the phrase repeats", () => {
    const [hit] = findLinkCandidates(`alpha cms ${filler}cms omega`, [
      { collection: "p", docId: "1", phrases: ["cms"] },
    ]);
    expect(hit.count).toBe(2);
    expect(hit.snippet).toMatch(/^alpha cms (lorem )+lorem …$/u);
  });
});
