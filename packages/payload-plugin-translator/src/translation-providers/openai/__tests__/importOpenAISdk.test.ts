import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { loadOpenAIClient } from "../loadOpenAIClient.js";

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/.*$/gmu, "");

const CODE = stripComments(readFileSync(join(__dirname, "..", "loadOpenAIClient.ts"), "utf-8"));

describe("importOpenAISdk stays traceable by @vercel/nft", () => {
  it("imports through a module-level constant, never a parameter", () => {
    expect(CODE).toMatch(/const OPENAI_MODULE = "openai";/u);
    expect(CODE).toMatch(/await import\(OPENAI_MODULE\)/u);
  });

  it("calls import() with nothing but that constant", () => {
    const importArguments = [...CODE.matchAll(/\bimport\(([^)]*)\)/gu)]
      .map((match) => match[1].trim())
      .filter((argument) => argument.length > 0);

    expect(importArguments).toEqual(["OPENAI_MODULE"]);
  });

  it("takes its test seam as a function rather than a specifier", () => {
    expect(CODE).toMatch(/importSdk\s*:\s*OpenAISdkImporter/u);
  });

  it("loads the real SDK through the default importer — every other test injects one", async () => {
    const client = await loadOpenAIClient({ apiKey: "sk-not-used-no-request-is-made" });

    expect(client.chat.completions.create).toBeTypeOf("function");
  });
});
