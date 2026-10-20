import { describe, expect, it } from "vitest";
import { applyTranslations } from "../collect.js";
import { article, articleSchema } from "./fixtures/documents.js";
import { collect } from "./fixtures/harness.js";

describe("write-back", () => {
  it("reaches the element with the matching id, not the one in that position", () => {
    const source = article();
    const target = article();
    target.sections.reverse();

    const targets = collect({ fields: articleSchema, source, target });
    applyTranslations(
      targets,
      targets.map((target_) => `<${target_.text}>`)
    );

    const sections = target.sections as Array<Record<string, unknown>>;
    expect(sections.find((section) => section.id === "a")?.heading).toBe("<Hi>");
    expect(sections.find((section) => section.id === "b")?.quote).toBe("<Quote>");
    expect(sections.find((section) => section.id === "b")?.author).toBe("<Author>");
  });

  it("leaves a target alone when its translation is missing, and writes the ones given", () => {
    const source = article();
    const target = article();

    const targets = collect({ fields: articleSchema, source, target });
    // First answered, second withheld: the pair is what separates "left alone" from "wrote nothing".
    applyTranslations(targets, ["translated", undefined]);

    expect(target.title).toBe("translated");
    expect(target.kicker).toBe("Kicker");
  });

  it("writes into the target document and never into the source", () => {
    const source = article();
    const target = article();

    const targets = collect({ fields: articleSchema, source, target });
    applyTranslations(
      targets,
      targets.map(() => "translated")
    );

    expect(target.title).toBe("translated");
    expect(source.title).toBe("Hello");
  });
});
