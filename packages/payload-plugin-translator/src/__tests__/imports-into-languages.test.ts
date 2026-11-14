import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Two zones are meant to work for any host: the traversal engine, and the core around it. The
 * sibling that would quietly end that is `src/languages`, where a concrete format is decided —
 * and neither zone's other guard covers this edge, since the lint bans frameworks rather than
 * siblings and the engine's own scan skips its tests. A fixture naming a language as a type is
 * how those tests say which format they stand in for, so the edge stays open and the two rules
 * below are what hold it.
 */
const SRC = dirname(dirname(fileURLToPath(import.meta.url)));
const HOST_NEUTRAL = [join(SRC, "core"), join(SRC, "traversal")];

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
  HOST_NEUTRAL.flatMap((zone) =>
    filesIn(zone).flatMap((file) => {
      const source = readFileSync(file, "utf-8");
      const statik = [...source.matchAll(STATIC_REACH)].map((match) => ({
        file: relative(SRC, file),
        typeOnly: match.groups?.type !== undefined,
      }));
      const dynamic = [...source.matchAll(DYNAMIC_REACH)].map(() => ({
        file: relative(SRC, file),
        typeOnly: false,
      }));
      return [...statik, ...dynamic];
    })
  );

describe("what the host-neutral code reaches into the languages for", () => {
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
