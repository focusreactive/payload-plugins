import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CLIENT = join(dirname(fileURLToPath(import.meta.url)), "..");

const REFRESH_OWNER = "entities/translation/queries/useRefreshTranslation.ts";
const KEY_OWNER = "entities/translation/queries/translationKeys.ts";

const sourcesIn = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "__tests__") return [];
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourcesIn(full);
    return /\.tsx?$/u.test(entry.name) ? [full] : [];
  });

const files = sourcesIn(CLIENT).map((file) => ({
  path: relative(CLIENT, file).split(sep).join("/"),
  source: readFileSync(file, "utf-8"),
}));

const pathsMatching = (pattern: RegExp) =>
  files.filter(({ source }) => pattern.test(source)).map(({ path }) => path);

describe("refreshing translation reads belongs to the entity", () => {
  it("has client files to scan", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("invalidates the cache in one place only", () => {
    expect(pathsMatching(/invalidateQueries\(/u)).toEqual([REFRESH_OWNER]);
  });

  it("spells no query key outside the key file", () => {
    expect(pathsMatching(/queryKey:\s*\[/u).filter((path) => path !== KEY_OWNER)).toEqual([]);
  });
});
