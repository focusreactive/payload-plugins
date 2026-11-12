import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * `depends-on-nothing.test.ts` rejects only non-relative specifiers, so a relative reach from
 * `src/core` into a sibling directory passes it. This is that edge's guard.
 */
const CORE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const STATIC_REACH =
  /\b(?:import|export)\s+(?<type>type\s+)?[^;]*?from\s+["'][^"']*\/languages\/[^"']+["']/gu;
const DYNAMIC_REACH = /\bimport\s*\(\s*["'][^"']*\/languages\/[^"']+["']/gu;

const filesIn = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesIn(full));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
};

type Reach = { file: string; typeOnly: boolean };

const reaches = (): Reach[] =>
  filesIn(CORE).flatMap((file) => {
    const source = readFileSync(file, "utf-8");
    const statik = [...source.matchAll(STATIC_REACH)].map((match) => ({
      file: relative(CORE, file),
      typeOnly: match.groups?.type !== undefined,
    }));
    const dynamic = [...source.matchAll(DYNAMIC_REACH)].map(() => ({
      file: relative(CORE, file),
      typeOnly: false,
    }));
    return [...statik, ...dynamic];
  });

describe("what the core reaches into the languages for", () => {
  const found = reaches();

  it("reaches at all, so a moved file cannot make the rules below vacuous", () => {
    expect(found.length).toBeGreaterThan(0);
  });

  it("names a language only as a type", () => {
    expect(found.filter((reach) => !reach.typeOnly)).toEqual([]);
  });

  it("does so only from a test fixture, never from a file it ships", () => {
    expect(found.filter((reach) => !reach.file.includes("__tests__"))).toEqual([]);
  });
});
