import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../src");
const DOM_ENTRY = resolve(SOURCE_ROOT, "dom/index.ts");
const PEERS = /^(?:payload|react|react-dom|next|@payloadcms\/[^/]+)(?:\/|$)/u;
const IMPORTED_MODULE = /(?:\bfrom|\bimport)\s*\(?\s*["']([^"']+)["']/gu;
const LEXICAL = /^(?:lexical|@lexical\/[^/]+)$/u;
const CLIENT_ENTRY = resolve(SOURCE_ROOT, "client/index.ts");
const RICH_TEXT_ENTRY = resolve(SOURCE_ROOT, "rich-text/index.ts");
const SOURCE_EXTENSIONS = [".ts", ".tsx"];
const COMPILED_EXTENSION = /\.js$/u;

const importsOf = (file: string): string[] =>
  [...readFileSync(file, "utf-8").matchAll(IMPORTED_MODULE)].map(
    ([, specifier]) => specifier ?? ""
  );

const sourceOf = (importer: string, specifier: string): string => {
  const compiled = resolve(dirname(importer), specifier);
  const sources = SOURCE_EXTENSIONS.map((extension) =>
    compiled.replace(COMPILED_EXTENSION, extension)
  );
  return sources.find((source) => existsSync(source)) ?? compiled;
};

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

  it.each([
    ["without React", DOM_ENTRY],
    ["for React", CLIENT_ENTRY],
  ])(
    "reach nothing of Lexical by any import, a dynamic one included, in the entry %s",
    (_name, entry) => {
      const reached = [...packagesImportedFrom(entry).keys()];

      expect(reached.filter((specifier) => LEXICAL.test(specifier))).toEqual([]);
    }
  );

  it("reach Lexical from the entry a site opts into, which imports no peer of the package either", () => {
    const reached = [...packagesImportedFrom(RICH_TEXT_ENTRY).keys()];

    expect(reached).toContain("lexical");
    expect(reached.filter((specifier) => PEERS.test(specifier))).toEqual([]);
  });
});
