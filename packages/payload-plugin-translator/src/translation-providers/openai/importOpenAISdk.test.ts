import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { loadOpenAIClient } from "./loadOpenAIClient";

const SOURCE = readFileSync(join(__dirname, "loadOpenAIClient.ts"), "utf-8");

/**
 * Comments stripped: the file's own JSDoc quotes `import("openai")` while explaining why that literal
 * form is not what ships, and an assertion about the code must not read the prose about the code.
 */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/.*$/gmu, "");

/**
 * These two tests exist because of a defect that reached production-shaped code and survived a
 * completeness pass plus four review rounds with everything green.
 *
 * The SDK is loaded through `import()`. Deployment file-tracers — `@vercel/nft`, behind Vercel builds
 * and Next's `output: "standalone"` — resolve those statically to decide what to copy into the
 * deployment. A module-level constant they can follow; a specifier arriving as a *function parameter*
 * they cannot, and they say nothing about it. So `openai` was silently pruned from the deployment and
 * the first translation in production failed with "install openai" for a package that was installed.
 *
 * Nothing in the existing suite could tell the two shapes apart: the file still contained the literal
 * "openai" either way, and every other test substitutes the importer, so the function that actually
 * performs the import was executed by no test at all.
 */
describe("the SDK import stays traceable by deployment file-tracers", () => {
  it("imports through a module-level constant, never a parameter", () => {
    // The shape that ships. `import(<identifier>)` where the identifier is a module-level `const` is
    // what a tracer follows; `import(<parameter>)` is what it silently ignores.
    expect(CODE).toMatch(/const OPENAI_MODULE = "openai";/u);
    expect(CODE).toMatch(/await import\(OPENAI_MODULE\)/u);
  });

  it("calls import() with nothing but that constant", () => {
    // The check that actually separates the two shapes. A parameter name elsewhere in the file is
    // fine — `isModuleNotFound` legitimately takes one — what must never happen is an `import()` whose
    // argument is anything other than the module-level constant.
    const importArguments = [...CODE.matchAll(/\bimport\(([^)]*)\)/gu)]
      .map((match) => match[1].trim())
      .filter((argument) => argument.length > 0);

    expect(importArguments).toEqual(["OPENAI_MODULE"]);
  });

  it("takes its test seam as a function rather than a specifier", () => {
    expect(CODE).toMatch(/importSdk\s*:\s*OpenAISdkImporter/u);
  });

  // Every other test substitutes `importSdk`, so without this one the real importer — the only code
  // that touches the SDK — would never run.
  it("actually loads the SDK through the default importer", async () => {
    const client = await loadOpenAIClient({ apiKey: "sk-not-used-no-request-is-made" });

    expect(client.chat.completions.create).toBeTypeOf("function");
  });
});
