import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ROOTS = ["server", "core"];

const DECLARES =
  /class ([A-Za-z_][A-Za-z0-9_]*) extends (TranslatorError|TranslationProviderError)\b/gu;

/** Matches literal `throw new X(...)` only. A thrown variable or a rethrow is out of reach here. */
const THROW = /throw new ([A-Za-z_][A-Za-z0-9_]*)\(/gu;

const sourceFilesIn = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "__tests__" || entry.name === "__mocks__") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFilesIn(full));
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) out.push(full);
  }
  return out;
};

/** Built from the classes that actually extend the root, so a name nobody declared cannot pass. */
const declaredSubclasses = (files: string[]): Set<string> => {
  const found = new Set<string>();
  for (const file of files) {
    for (const m of readFileSync(file, "utf-8").matchAll(DECLARES)) found.add(m[1] as string);
  }
  return found;
};

describe("every literal `throw new X(...)` constructs one of ours", () => {
  const files = [...ROOTS, "translation-providers"].flatMap((r) => sourceFilesIn(join(SRC, r)));
  const ours = declaredSubclasses(files);

  it("has source files to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("found the classes to check against", () => {
    expect(ours, "an empty allow list would pass every file vacuously").not.toEqual(new Set());
  });

  it.each(["Error", "APIError", "TypeError", "DOMException"])("rejects %s", (name) => {
    expect(ours.has(name), "a built-in must never read as one of ours").toBe(false);
  });

  it.each(files.map((f) => [relative(SRC, f), f]))("%s", (_label, file) => {
    const thrown = [...readFileSync(file, "utf-8").matchAll(THROW)].map((m) => m[1] as string);

    expect(thrown.filter((name) => !ours.has(name))).toEqual([]);
  });
});
