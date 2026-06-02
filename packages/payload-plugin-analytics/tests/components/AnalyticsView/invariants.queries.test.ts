import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { glob } from "glob";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../../src/components/AnalyticsView");

function readAllTs(pattern: string): Array<{ file: string; src: string }> {
  const files = glob.sync(pattern, { cwd: ROOT, absolute: true });

  return files.map((file) => ({ file, src: readFileSync(file, "utf-8") }));
}

describe("AnalyticsView query-layer invariants", () => {
  it("fetch( only appears in hooks/queries/client.ts", () => {
    const offenders: string[] = [];

    for (const { file, src } of readAllTs("**/*.{ts,tsx}")) {
      if (file.replace(/\\/gu, "/").endsWith("hooks/queries/client.ts")) continue;

      const lines = src.split("\n");
      lines.forEach((line, i) => {
        // Skip comments; match a bare fetch( call.
        if (/\bfetch\s*\(/u.test(line) && !/^\s*\/\//u.test(line)) {
          offenders.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }

    expect(offenders, `fetch( found outside client.ts:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("literal '\"analytics\"' key array only appears in hooks/queries/keys.ts", () => {
    const offenders: string[] = [];

    for (const { file, src } of readAllTs("**/*.{ts,tsx}")) {
      if (file.replace(/\\/gu, "/").endsWith("hooks/queries/keys.ts")) continue;
      // Match a literal array starting with the "analytics" string segment.
      // e.g. ["analytics", … ]
      if (/\[\s*"analytics"\s*,/u.test(src)) {
        offenders.push(file);
      }
    }

    expect(offenders, `["analytics", …] literal found outside keys.ts:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("@tanstack/react-query only imported from the allow-list", () => {
    const allow = new Set(["AnalyticsProviders.tsx", "RefreshButton.tsx", "tabs/SessionsTab.tsx"].map((p) => path.resolve(ROOT, p).replace(/\\/gu, "/")));

    const offenders: string[] = [];

    for (const { file, src } of readAllTs("**/*.{ts,tsx}")) {
      const norm = file.replace(/\\/gu, "/");

      if (norm.includes("/hooks/queries/")) continue;
      if (allow.has(norm)) continue;

      if (/from\s+["']@tanstack\/react-query["']/u.test(src)) {
        offenders.push(file);
      }
    }

    expect(offenders, `@tanstack/react-query imported outside the allow-list:\n${offenders.join("\n")}`).toEqual([]);
  });
});
