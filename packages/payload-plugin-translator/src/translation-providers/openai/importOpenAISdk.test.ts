import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { loadOpenAIClient } from "./loadOpenAIClient";

const SOURCE = readFileSync(join(__dirname, "loadOpenAIClient.ts"), "utf-8");

/**
 * Comments stripped: the file's own JSDoc quotes `import("openai")`, which would satisfy the
 * assertions below.
 */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/.*$/gmu, "");

/**
 * Guards the `@vercel/nft` constraint documented on `importOpenAISdk`. Every other test substitutes
 * the importer, so nothing else exercises the real import.
 */
describe("the SDK import stays traceable by deployment file-tracers", () => {
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

  it("actually loads the SDK through the default importer", async () => {
    const client = await loadOpenAIClient({ apiKey: "sk-not-used-no-request-is-made" });

    expect(client.chat.completions.create).toBeTypeOf("function");
  });
});
