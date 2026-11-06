import { describe, expect, it } from "vitest";

import { buildSystemPrompt } from "../buildSystemPrompt.js";
import { inlineMarksInstruction } from "../wire/index.js";

const DOCUMENT = { collection: "docs", id: "1" };

// Pinned verbatim: consumers extend this exact string via `defaultPrompt`, so a reword is breaking.
const EXPECTED_EN_DE = `Translate the values from the JSON that the user will send you from en into de. Keep all JSON keys exactly as they are, only translate the values.
The response should be a valid JSON object with the same structure and keys as the input, but with translated values.
Maintain any special formatting, placeholders, or variables within the values if they exist.`;

describe("buildSystemPrompt", () => {
  it("produces the shipped default text unchanged", async () => {
    expect(await buildSystemPrompt({ sourceLng: "en", targetLng: "de", document: DOCUMENT })).toBe(
      EXPECTED_EN_DE
    );
  });

  it("hands the default to an override and returns what the override builds", async () => {
    const prompt = await buildSystemPrompt({
      sourceLng: "en",
      targetLng: "fr",
      document: DOCUMENT,
      override: ({ defaultPrompt }) => `${defaultPrompt}\nUse formal language.`,
    });

    expect(prompt).toBe(
      `${await buildSystemPrompt({ sourceLng: "en", targetLng: "fr", document: DOCUMENT })}\nUse formal language.`
    );
  });

  it("passes both language codes to the override", async () => {
    const seen: string[] = [];

    await buildSystemPrompt({
      sourceLng: "en",
      targetLng: "fr",
      document: DOCUMENT,
      override: ({ sourceLang, targetLang }) => {
        seen.push(sourceLang, targetLang);
        return "replaced";
      },
    });

    expect(seen).toEqual(["en", "fr"]);
  });

  it("lets an override replace the default entirely", async () => {
    expect(
      await buildSystemPrompt({
        sourceLng: "en",
        targetLng: "fr",
        document: DOCUMENT,
        override: () => "only this",
      })
    ).toBe("only this");
  });

  it("awaits an override that answers with a promise before appending to it", async () => {
    const prompt = await buildSystemPrompt({
      sourceLng: "en",
      targetLng: "fr",
      document: DOCUMENT,
      alwaysAppend: [inlineMarksInstruction()],
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

  describe("always-appended blocks", () => {
    it("appends one block after the default, separated by a blank line", async () => {
      const prompt = await buildSystemPrompt({
        sourceLng: "en",
        targetLng: "de",
        document: DOCUMENT,
        alwaysAppend: [inlineMarksInstruction()],
      });

      expect(prompt).toBe(`${EXPECTED_EN_DE}\n\n${inlineMarksInstruction()}`);
    });

    it("appends every block, in the order given, after an override that ignores defaultPrompt", async () => {
      const prompt = await buildSystemPrompt({
        sourceLng: "en",
        targetLng: "de",
        document: DOCUMENT,
        alwaysAppend: ["First addition.", "Second addition."],
        override: () => "Translate to German. Be formal.",
      });

      expect(prompt).toBe("Translate to German. Be formal.\n\nFirst addition.\n\nSecond addition.");
    });

    it("adds no separator when the list is empty", async () => {
      expect(
        await buildSystemPrompt({
          sourceLng: "en",
          targetLng: "de",
          document: DOCUMENT,
          alwaysAppend: [],
        })
      ).toBe(EXPECTED_EN_DE);
    });

    it("adds no separator when the list is omitted", async () => {
      expect(
        await buildSystemPrompt({ sourceLng: "en", targetLng: "de", document: DOCUMENT })
      ).toBe(EXPECTED_EN_DE);
    });

    it("says nothing about marks unless the mark instruction is one of the blocks", async () => {
      const prompt = await buildSystemPrompt({
        sourceLng: "en",
        targetLng: "de",
        document: DOCUMENT,
      });

      expect(prompt).not.toContain("mark");
    });
  });
});
