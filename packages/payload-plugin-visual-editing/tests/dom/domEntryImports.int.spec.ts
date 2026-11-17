import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../src");
const DOM_ENTRY = resolve(SOURCE_ROOT, "dom/index.ts");
const PEERS = /^(?:payload|react|react-dom|next|@payloadcms\/[^/]+)(?:\/|$)/u;
const IMPORTED_MODULE = /(?:\bfrom|\bimport)\s*\(?\s*["']([^"']+)["']/gu;
const COMPILED_EXTENSION = /\.js$/u;

const importsOf = (file: string): string[] =>
  [...readFileSync(file, "utf-8").matchAll(IMPORTED_MODULE)].map(
    ([, specifier]) => specifier ?? ""
  );

const sourceOf = (importer: string, specifier: string): string =>
  resolve(dirname(importer), specifier.replace(COMPILED_EXTENSION, ".ts"));

const packagesImportedFrom = (entry: string): Map<string, string> => {
  const packages = new Map<string, string>();
  const seen = new Set<string>();
  const queue = [entry];
  for (const file of queue) {
    if (seen.has(file)) continue;
    seen.add(file);
    for (const specifier of importsOf(file)) {
      if (specifier.startsWith(".")) queue.push(sourceOf(file, specifier));
      else packages.set(specifier, file.slice(SOURCE_ROOT.length + 1));
    }
  }
  return packages;
};

describe("the modules the entry without React loads", () => {
  it("import no peer of the package, in code or in types, so a site without Payload and React can use them", () => {
    const peers = [...packagesImportedFrom(DOM_ENTRY)].filter(([specifier]) =>
      PEERS.test(specifier)
    );

    expect(peers).toEqual([]);
  });

  it("are found through the imports of the entry", () => {
    const packages = packagesImportedFrom(DOM_ENTRY);

    expect([...packages.keys()]).toContain("@vercel/stega");
  });
});
