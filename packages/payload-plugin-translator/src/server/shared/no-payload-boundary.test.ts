import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Boundary backstop for the @repo/translator-core extraction. The agnostic-core
// zones must stay framework-agnostic — no file may import from the framework.
// The CI boundary lint (oxlint no-restricted-imports, see root oxlint.config.ts)
// is the edit-time enforcement; this executable scan is the cheap regression net.
//
// Scans DIRECT static import statements only — it does not catch a framework type
// pulled in transitively through another module's return type. Full enforcement
// comes with the package boundary in the extraction's capstone slice.
//
// Both zones ban the same thing — `payload`, `payload/*`, and `@payloadcms/*` — so
// this stays in lockstep with the oxlint boundary (root oxlint.config.ts), which
// bans `@payloadcms/*` in both zones too.

const HERE = dirname(fileURLToPath(import.meta.url));

// Matches `from "payload"`, `from "payload/shared"`, `from "@payloadcms/..."`
// (single or double quotes).
const FRAMEWORK_IMPORT = /from\s+["'](payload(\/[\w/-]+)?|@payloadcms\/[\w/-]+)["']/u;

const zones = [join(HERE, "field-traversal"), join(HERE, "lexical")];

const sourceFilesIn = (dir: string) =>
  readdirSync(dir).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));

describe.each(zones)("%s is free of payload / @payloadcms imports", (dir) => {
  const sourceFiles = sourceFilesIn(dir);

  it("has at least one source file to check", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it.each(sourceFiles)("%s does not import the framework", (file) => {
    const contents = readFileSync(join(dir, file), "utf-8");
    const offending = contents.split("\n").filter((line) => FRAMEWORK_IMPORT.test(line));
    expect(offending).toEqual([]);
  });
});
