import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The kernel imports nothing — not a library, not a sibling of the plugin that contains it, not
 * even the plugin's own shared code. While it lived in a package of its own that was a package
 * boundary; here it is this scan, and losing it is how the kernel would quietly stop being
 * something that can be lifted out again.
 *
 * The surrounding `src/core` lint zone is a weaker rule: it bans Payload, React and Next, and
 * would let a dependency through.
 */
const KERNEL = join(dirname(fileURLToPath(import.meta.url)), "..");

const IMPORT_FROM = /\bfrom\s+["']([^"']+)["']/gu;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*["']([^"']+)["']/gu;

const shippedFilesIn = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "__tests__") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...shippedFilesIn(full));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
};

describe("the traversal kernel depends on nothing", () => {
  const files = shippedFilesIn(KERNEL);

  it("has source files to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [relative(KERNEL, f), f]))(
    "%s imports only its own files",
    (_l, file) => {
      const source = readFileSync(file, "utf-8");
      const specifiers = [...source.matchAll(IMPORT_FROM), ...source.matchAll(DYNAMIC_IMPORT)].map(
        (m) => m[1] as string
      );

      expect(specifiers.filter((s) => !s.startsWith("."))).toEqual([]);
    }
  );
});
