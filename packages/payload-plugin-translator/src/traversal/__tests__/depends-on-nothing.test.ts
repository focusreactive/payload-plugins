import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The kernel imports nothing — not a library, not a sibling of the plugin that contains it, not
 * even the plugin's own shared code. While it lived in a package of its own that was a package
 * boundary; here it is this scan, and losing it is how the kernel would quietly stop being
 * something that can be lifted out again.
 *
 * The lint zone beside it says the same thing one directory depth at a time, so it stops covering
 * a folder nested deeper than the ones that exist today. This resolves each path instead, which is
 * why both are kept.
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

const leavesTheKernel = (file: string, specifier: string): boolean => {
  if (!specifier.startsWith(".")) return true;
  const target = resolve(dirname(file), specifier);
  return target !== KERNEL && !target.startsWith(KERNEL + sep);
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

      expect(specifiers.filter((s) => leavesTheKernel(file, s))).toEqual([]);
    }
  );
});
