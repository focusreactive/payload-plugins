import { describe, expect, it } from "vitest";

import { buildSystemPrompt } from "./buildSystemPrompt";

// Pinned verbatim: consumers extend this exact string via `defaultPrompt`, so a reword is breaking.
const EXPECTED_EN_DE = `Translate the values from the JSON that the user will send you from en into de. Keep all JSON keys exactly as they are, only translate the values.
The response should be a valid JSON object with the same structure and keys as the input, but with translated values.
Maintain any special formatting, placeholders, or variables within the values if they exist.`;

const SOURCE_LANGUAGE_CLAUSE = "send you from";

describe("buildSystemPrompt", () => {
  it("produces the shipped default text unchanged", () => {
    expect(buildSystemPrompt({ sourceLng: "en", targetLng: "de" })).toBe(EXPECTED_EN_DE);
  });

  it("omits the source clause when the source language is empty (auto-detect)", () => {
    const prompt = buildSystemPrompt({ sourceLng: "", targetLng: "de" });

    expect(prompt).toContain("send you into de");
    expect(prompt).not.toContain(SOURCE_LANGUAGE_CLAUSE);
  });

  it("hands the default to an override and returns what the override builds", () => {
    const prompt = buildSystemPrompt({
      sourceLng: "en",
      targetLng: "fr",
      override: ({ defaultPrompt }) => `${defaultPrompt}\nUse formal language.`,
    });

    expect(prompt).toBe(
      `${buildSystemPrompt({ sourceLng: "en", targetLng: "fr" })}\nUse formal language.`
    );
  });

  it("passes both language codes to the override", () => {
    const seen: string[] = [];

    buildSystemPrompt({
      sourceLng: "en",
      targetLng: "fr",
      override: ({ sourceLang, targetLang }) => {
        seen.push(sourceLang, targetLang);
        return "replaced";
      },
    });

    expect(seen).toEqual(["en", "fr"]);
  });

  it("lets an override replace the default entirely", () => {
    expect(
      buildSystemPrompt({ sourceLng: "en", targetLng: "fr", override: () => "only this" })
    ).toBe("only this");
  });
});
