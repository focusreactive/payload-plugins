import { describe, expect, it } from "vitest";

import { buildSystemPrompt } from "./buildSystemPrompt.js";

// Pinned verbatim: consumers extend this exact string via `defaultPrompt`, so a reword is breaking.
const EXPECTED_EN_DE = `Translate the values from the JSON that the user will send you from en into de. Keep all JSON keys exactly as they are, only translate the values.
The response should be a valid JSON object with the same structure and keys as the input, but with translated values.
Maintain any special formatting, placeholders, or variables within the values if they exist.`;

const SOURCE_LANGUAGE_CLAUSE = "send you from";

describe("buildSystemPrompt", () => {
  it("produces the shipped default text unchanged", async () => {
    expect(await buildSystemPrompt({ sourceLng: "en", targetLng: "de" })).toBe(EXPECTED_EN_DE);
  });

  it("omits the source clause when the source language is empty (auto-detect)", async () => {
    const prompt = await buildSystemPrompt({ sourceLng: "", targetLng: "de" });

    expect(prompt).toContain("send you into de");
    expect(prompt).not.toContain(SOURCE_LANGUAGE_CLAUSE);
  });

  it("hands the default to an override and returns what the override builds", async () => {
    const prompt = await buildSystemPrompt({
      sourceLng: "en",
      targetLng: "fr",
      override: ({ defaultPrompt }) => `${defaultPrompt}\nUse formal language.`,
    });

    expect(prompt).toBe(
      `${await buildSystemPrompt({ sourceLng: "en", targetLng: "fr" })}\nUse formal language.`
    );
  });

  it("passes both language codes to the override", async () => {
    const seen: string[] = [];

    await buildSystemPrompt({
      sourceLng: "en",
      targetLng: "fr",
      override: ({ sourceLang, targetLang }) => {
        seen.push(sourceLang, targetLang);
        return "replaced";
      },
    });

    expect(seen).toEqual(["en", "fr"]);
  });

  it("lets an override replace the default entirely", async () => {
    expect(
      await buildSystemPrompt({ sourceLng: "en", targetLng: "fr", override: () => "only this" })
    ).toBe("only this");
  });

  it("awaits an override that answers with a promise before appending to it", async () => {
    const prompt = await buildSystemPrompt({
      sourceLng: "en",
      targetLng: "fr",
      hasInlineMarks: true,
      override: async ({ defaultPrompt }) => `${defaultPrompt}\nGlossary: ampere = Ampere.`,
    });

    expect(prompt, "an unawaited promise would be concatenated as [object Promise]").toContain(
      "Glossary: ampere = Ampere."
    );
    expect(prompt).toContain("Return every mark exactly once");
  });

  it("names the collection and the document the run is translating", async () => {
    let seen: { collection: string; id: string } | undefined;

    await buildSystemPrompt({
      sourceLng: "en",
      targetLng: "fr",
      document: { collection: "machines", id: "7" },
      override: (context) => {
        seen = context.document;
        return "replaced";
      },
    });

    expect(seen).toEqual({ collection: "machines", id: "7" });
  });

  describe("inline marks", () => {
    it("appends the mark instruction when the values carry marks", async () => {
      const prompt = await buildSystemPrompt({
        sourceLng: "en",
        targetLng: "de",
        hasInlineMarks: true,
      });

      expect(prompt).toContain("Return every mark exactly once");
    });

    it("says nothing about marks when no value carries one", async () => {
      const prompt = await buildSystemPrompt({ sourceLng: "en", targetLng: "de" });

      expect(prompt).not.toContain("mark");
    });

    it("appends the mark instruction after an override that ignores defaultPrompt", async () => {
      const prompt = await buildSystemPrompt({
        sourceLng: "en",
        targetLng: "de",
        hasInlineMarks: true,
        override: () => "Translate to German. Be formal.",
      });

      expect(prompt.startsWith("Translate to German. Be formal.")).toBe(true);
      expect(prompt).toContain("Return every mark exactly once");
    });
  });
});
