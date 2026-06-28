import { describe, expect, it } from "vitest";
import { buildPrompt } from "../../../src/server/generate/prompts";

const base = {
  contentHtml: "<h1>Acme CMS</h1><p>Build sites fast.</p>",
  config: {},
} as const;

describe("buildPrompt", () => {
  it("title prompt converts the pixel budget to a char range and forbids quotes", () => {
    const { system, user } = buildPrompt({
      ...base,
      kind: "title",
      range: { min: 400, max: 600, unit: "px" },
    });
    expect(system.toLowerCase()).toContain("title");
    // 400px / 8.5 -> ceil 48, 600px / 8.5 -> floor 70
    expect(system).toContain("48");
    expect(system).toContain("70");
    expect(system).toContain("characters");
    expect(system).not.toContain("600");
    expect(system.toLowerCase()).toContain("no quotes");
    expect(user).toContain("Acme CMS");
  });
  it("description prompt states the character budget", () => {
    const { system } = buildPrompt({
      ...base,
      kind: "description",
      range: { min: 120, max: 160, unit: "char" },
    });
    expect(system).toContain("160");
    expect(system.toLowerCase()).toContain("description");
  });
  it("mentions the locale when provided", () => {
    const { system } = buildPrompt({
      ...base,
      kind: "title",
      range: { min: 400, max: 600, unit: "px" },
      locale: "es",
    });
    expect(system).toContain("es");
  });
  it("uses a custom prompt override when given", () => {
    const { system } = buildPrompt({
      ...base,
      kind: "title",
      range: { min: 400, max: 600, unit: "px" },
      config: { titlePrompt: "CUSTOM RULES" },
    });
    expect(system).toContain("CUSTOM RULES");
  });
  it("uses the description prompt override when given", () => {
    const { system } = buildPrompt({
      ...base,
      kind: "description",
      range: { min: 120, max: 160, unit: "char" },
      config: { descriptionPrompt: "DESC RULES" },
    });
    expect(system).toContain("DESC RULES");
  });
});
