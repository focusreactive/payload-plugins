import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Boundary guard. The whole point of @repo/translator-core is that this layer is
// framework-agnostic, so no file in field-traversal/** may import from `payload` (runtime or
// type). NOTE: this scans for DIRECT import statements only — it does not catch a payload type
// pulled in transitively through another module's return type. Full enforcement comes with the
// package boundary in the extraction's capstone slice; this is the cheap in-repo regression net.

const HERE = dirname(fileURLToPath(import.meta.url));

const sourceFiles = readdirSync(HERE).filter(
  (name) => name.endsWith(".ts") && !name.endsWith(".test.ts")
);

// Matches both `from "payload"` and `from "payload/shared"`, single or double quotes.
const PAYLOAD_IMPORT = /from\s+["']payload(\/[\w/-]+)?["']/u;

describe("field-traversal is free of payload imports", () => {
  it("has at least one source file to check", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it.each(sourceFiles)("%s does not import from payload", (file) => {
    const contents = readFileSync(join(HERE, file), "utf-8");
    const offending = contents.split("\n").filter((line) => PAYLOAD_IMPORT.test(line));
    expect(offending).toEqual([]);
  });
});
