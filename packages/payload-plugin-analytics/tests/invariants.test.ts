import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";
import { describe, expect, it } from "vitest";
import { ANALYTICS_ENDPOINT_PATHS } from "../src/constants/endpoints";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const PKG = resolve(__dirname, "..");

describe("invariants", () => {
  it("no GA4 SDK imports outside services/ga4DataClient and services/analyticsService", async () => {
    const files = await glob("src/**/*.{ts,tsx}", {
      cwd: PKG,
      ignore: [
        "src/services/ga4DataClient/**",
        "src/services/analyticsService/**",
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
      ],
    });
    const offenders = files.filter((f) =>
      /from\s+["']@google-analytics\/data["']/.test(readFileSync(resolve(PKG, f), "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("endpoint paths in constants are all /analytics/* (Payload prefixes /api)", () => {
    for (const v of Object.values(ANALYTICS_ENDPOINT_PATHS)) {
      expect(v).toMatch(/^\/analytics\//);
    }
  });
});
