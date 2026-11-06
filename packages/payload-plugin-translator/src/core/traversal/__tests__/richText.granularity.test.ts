import { describe, expect, it } from "vitest";
import { applyTranslations } from "../collect.js";
import { bodySchema } from "./fixtures/documents.js";
import { collect, paragraph } from "./fixtures/harness.js";

describe("how a leaf is cut is the language's own choice", () => {
  it("gives one unit per text node when built that way", () => {
    const document = paragraph();
    const targets = collect({
      fields: bodySchema(),
      source: document,
      target: document,
      cut: "per-text-node",
    });

    expect(targets.map((target) => target.text)).toEqual(["I bought a ", "red", " car"]);
  });

  it("gives the whole container with its formatting numbered when built that way", () => {
    const document = paragraph();
    const targets = collect({
      fields: bodySchema(),
      source: document,
      target: document,
      cut: "whole-container",
    });

    expect(targets.map((target) => target.text)).toEqual([
      "<1>I bought a </1><2>red</2><3> car</3>",
    ]);
  });

  it("refuses a reply carrying text outside its marks, rather than writing half of it", () => {
    const document = paragraph();
    const targets = collect({
      fields: bodySchema(),
      source: document,
      target: document,
      cut: "whole-container",
    });

    expect(targets).toHaveLength(1);

    // Every mark is present and correctly numbered — only the trailing words sit outside one,
    // so nothing but the stray-text rule can refuse this reply.
    applyTranslations(targets, ["<1>Я купил </1><2>красную</2><3> машину</3> и уехал"]);

    const content = document.body.content[0]?.content ?? [];
    expect(content.map((node) => node.text)).toEqual(["I bought a ", "red", " car"]);
  });

  it("puts a marked reply back on the pieces it came from", () => {
    const document = paragraph();
    const targets = collect({
      fields: bodySchema(),
      source: document,
      target: document,
      cut: "whole-container",
    });

    applyTranslations(targets, ["<1>Я купил </1><2>красную</2><3> машину</3>"]);

    const content = document.body.content[0]?.content ?? [];
    expect(content.map((node) => node.text)).toEqual(["Я купил ", "красную", " машину"]);
  });
});
