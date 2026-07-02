import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Boundary backstop for the framework-agnostic core (src/core). Every core file
// must stay framework-agnostic — no file may import from the framework. The CI
// boundary lint (oxlint no-restricted-imports, see root oxlint.config.ts) is the
// edit-time enforcement; this executable scan is the cheap regression net.
//
// Scans direct static and dynamic import statements only — it does not catch a framework type
// pulled in transitively through another module's return type. Full enforcement
// comes with the package boundary in the extraction's capstone slice.
//
// This stays in lockstep with the oxlint boundary (root oxlint.config.ts), which
// bans `payload`, `payload/*`, and `@payloadcms/*` across all of src/core.

const CORE = dirname(fileURLToPath(import.meta.url));

// Matches `from "payload"`, `from "payload/shared"`, `from "@payloadcms/..."`
// (single or double quotes).
const FRAMEWORK_IMPORT = /from\s+["'](payload(\/[\w/-]+)?|@payloadcms\/[\w/-]+)["']/u;

// Matches dynamic `import("payload")`, `import("@payloadcms/...")` calls
// (single or double quotes).
const FRAMEWORK_DYNAMIC_IMPORT =
  /import\s*\(\s*["'](payload(\/[\w/-]+)?|@payloadcms\/[\w/-]+)["']/u;

const sourceFilesIn = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...sourceFilesIn(full));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
};

describe("src/core is free of payload / @payloadcms imports", () => {
  const sourceFiles = sourceFilesIn(CORE);

  it("has source files to check", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it.each(sourceFiles)("%s does not import the framework", (file) => {
    const contents = readFileSync(file, "utf-8");
    const offending = contents
      .split("\n")
      .filter((line) => FRAMEWORK_IMPORT.test(line) || FRAMEWORK_DYNAMIC_IMPORT.test(line));
    expect(offending).toEqual([]);
  });
});
