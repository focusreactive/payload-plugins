import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Boundary guard. shared/lexical must be framework-agnostic for the @repo/translator-core
// extraction: no file here may import from `payload` OR `@payloadcms/*` (the Serialized* Lexical
// types must be owned locally, not pulled from the framework). Scans DIRECT import statements only
// — the package boundary in the capstone slice is the full enforcement; this is the cheap net.
//
// TODO(translator-core slice 5/7): this duplicates field-traversal/no-payload-import.test.ts.
// Consolidate both into one parametrized boundary check (or replace with the CI boundary lint)
// when dependency-direction fixes land.

const HERE = dirname(fileURLToPath(import.meta.url));

const sourceFiles = readdirSync(HERE).filter(
  (name) => name.endsWith(".ts") && !name.endsWith(".test.ts")
);

// Matches `from "payload"`, `from "payload/shared"`, `from "@payloadcms/..."` (single/double quotes).
// Intentionally covers only static named imports (`import ... from "..."`). Side-effect imports
// (`import "@payloadcms/..."`) and dynamic imports (`await import("...")`) are not matched — both
// are meaningless for type-only packages and are not expected in this layer.
const FRAMEWORK_IMPORT = /from\s+["'](payload(\/[\w/-]+)?|@payloadcms\/[\w/-]+)["']/u;

describe("shared/lexical is free of payload / @payloadcms imports", () => {
  it("has at least one source file to check", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it.each(sourceFiles)("%s does not import from payload/@payloadcms", (file) => {
    const contents = readFileSync(join(HERE, file), "utf-8");
    const offending = contents.split("\n").filter((line) => FRAMEWORK_IMPORT.test(line));
    expect(offending).toEqual([]);
  });
});
