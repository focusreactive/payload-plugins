import { vercelStegaCombine } from "@vercel/stega";
import { beforeEach, describe, expect, it } from "vitest";

import { collectAttrMatches, collectTextMatches } from "../src/client/overlay/stegaScanner";

const makeStegaText = (visible: string, path: string) =>
  vercelStegaCombine(visible, { path, collectionSlug: "pages", kind: "collection", docId: "p-1" });

describe("collectTextMatches", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns no matches for plain text", () => {
    const root = document.createElement("div");
    root.textContent = "Hello world";
    document.body.append(root);
    expect(collectTextMatches(root)).toEqual([]);
  });

  it("extracts VeIdentity from stega-bearing text nodes", () => {
    const root = document.createElement("div");
    root.textContent = makeStegaText("Hello", "hero.title");
    document.body.append(root);

    const matches = collectTextMatches(root);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      path: "hero.title",
      collectionSlug: "pages",
      kind: "collection",
      docId: "p-1",
    });
    expect(matches[0]!.textNode).toBeInstanceOf(Text);
  });

  // JSON-LD is the usual source of this: `JSON.stringify(stega-encoded string)` preserves
  // zero-width chars inside the <script> payload. Scanning those drags real hoverable
  // targets up to the common ancestor of the script and the rendered element.
  it("skips stega inside <script>, <style>, <noscript>, <template> tags", () => {
    const root = document.createElement("div");
    const visible = document.createElement("p");
    visible.textContent = makeStegaText("Visible text", "hero.title");
    const script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.textContent = `{"name":"${makeStegaText("Not editable", "hero.title")}"}`;
    const style = document.createElement("style");
    style.textContent = `.x::before{content:"${makeStegaText("x", "hero.title")}"}`;
    const noscript = document.createElement("noscript");
    noscript.textContent = makeStegaText("no js", "hero.title");
    const template = document.createElement("template");
    template.textContent = makeStegaText("template", "hero.title");
    root.append(visible, script, style, noscript, template);
    document.body.append(root);

    const matches = collectTextMatches(root);
    expect(matches).toHaveLength(1);
    expect(matches[0]!.textNode.parentElement?.tagName).toBe("P");
  });

  it("skips text nodes that pass prefilter but do not decode to a valid VeIdentity", () => {
    const root = document.createElement("div");
    // Include a zero-width character so the prefilter lets it through, but the payload is junk.
    root.textContent = `\u200B this has ZWSP but no stega`;
    document.body.append(root);
    expect(collectTextMatches(root)).toEqual([]);
  });
});

describe("collectAttrMatches", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("emits only allowlisted attrs carrying stega", () => {
    const root = document.createElement("div");
    const img = document.createElement("img");
    img.setAttribute("alt", makeStegaText("Alt text", "hero.image.alt"));
    img.setAttribute("data-custom", makeStegaText("Not allowlisted", "hero.image.data"));
    root.append(img);
    document.body.append(root);

    const matches = collectAttrMatches(root);
    expect(matches.map((m) => m.attr)).toEqual(["alt"]);
  });

  it("ignores allowlisted attrs without stega", () => {
    const root = document.createElement("div");
    const img = document.createElement("img");
    img.setAttribute("alt", "plain alt, no stega");
    img.setAttribute("title", "plain title");
    root.append(img);
    document.body.append(root);

    expect(collectAttrMatches(root)).toEqual([]);
  });

  it("picks up stega on placeholder and aria-label", () => {
    const root = document.createElement("div");
    const input = document.createElement("input");
    input.setAttribute("placeholder", makeStegaText("Type here", "form.q"));
    input.setAttribute("aria-label", makeStegaText("Question", "form.aria"));
    root.append(input);
    document.body.append(root);

    const attrs = collectAttrMatches(root)
      .map((m) => m.attr)
      .sort();
    expect(attrs).toEqual(["aria-label", "placeholder"]);
  });
});
