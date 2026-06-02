import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
      ignore: ["src/services/ga4DataClient/**", "src/services/analyticsService/**", "src/**/*.test.ts", "src/**/*.test.tsx"],
    });
    const offenders = files.filter((f) => /from\s+["']@google-analytics\/data["']/u.test(readFileSync(resolve(PKG, f), "utf-8")));
    expect(offenders).toEqual([]);
  });

  it("endpoint paths in constants are all /analytics/* (Payload prefixes /api)", () => {
    for (const v of Object.values(ANALYTICS_ENDPOINT_PATHS)) {
      expect(v).toMatch(/^\/analytics\//u);
    }
  });

  it("registers POST /analytics/journeys", () => {
    expect(ANALYTICS_ENDPOINT_PATHS.journeys).toBe("/analytics/journeys");
  });
});

describe("admin view invariants", () => {
  const COMPONENTS_DIR = "src/components/AnalyticsView";

  it("no recharts imports outside TrendChartInner.tsx and DonutChartInner.tsx", async () => {
    const files = await glob(`${COMPONENTS_DIR}/**/*.{ts,tsx}`, {
      cwd: PKG,
      ignore: [`${COMPONENTS_DIR}/ui/TrendChartInner.tsx`, `${COMPONENTS_DIR}/ui/DonutChartInner.tsx`],
    });
    const offenders = files.filter((f) => /from\s+["']recharts["']/u.test(readFileSync(resolve(PKG, f), "utf-8")));
    expect(offenders).toEqual([]);
  });

  it("no @heroicons or react-icons imports anywhere in AnalyticsView", async () => {
    const files = await glob(`${COMPONENTS_DIR}/**/*.{ts,tsx}`, { cwd: PKG });
    const offenders = files.filter((f) => {
      const src = readFileSync(resolve(PKG, f), "utf-8");
      return /@heroicons|react-icons/u.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it("no process.env reads inside AnalyticsView components", async () => {
    const files = await glob(`${COMPONENTS_DIR}/**/*.{ts,tsx}`, { cwd: PKG });
    const offenders = files.filter((f) => /process\.env/u.test(readFileSync(resolve(PKG, f), "utf-8")));
    expect(offenders).toEqual([]);
  });

  it("no router.replace or router.push outside useAnalyticsParams.ts", async () => {
    const files = await glob(`${COMPONENTS_DIR}/**/*.{ts,tsx}`, {
      cwd: PKG,
      ignore: [`${COMPONENTS_DIR}/hooks/useAnalyticsParams.ts`],
    });
    const offenders = files.filter((f) => {
      const src = readFileSync(resolve(PKG, f), "utf-8");
      return /router\.(replace|push)\b/u.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it("no services/ or endpoints/ imports from AnalyticsView", async () => {
    const files = await glob(`${COMPONENTS_DIR}/**/*.{ts,tsx}`, { cwd: PKG });
    const offenders = files.filter((f) => {
      const src = readFileSync(resolve(PKG, f), "utf-8");
      return /from\s+["']\.\.\/\.\.\/services|from\s+["']\.\.\/\.\.\/\.\.\/services|from\s+["']\.\.\/\.\.\/endpoints/u.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it("builtInRegistry.tsx is the only file mapping lead-action types -> LucideIcon", async () => {
    const files = await glob(`src/**/*.{ts,tsx}`, {
      cwd: PKG,
      ignore: ["src/utils/leadActions/builtInRegistry.tsx", "src/**/*.test.ts", "src/**/*.test.tsx"],
    });
    const offenders = files.filter((f) => {
      const src = readFileSync(resolve(PKG, f), "utf-8");
      return /"phone_click":|'phone_click':/u.test(src) && /Lucide/u.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it("no LEAD_ACTION_EVENTS imports remain in source", async () => {
    const files = await glob("src/**/*.{ts,tsx}", { cwd: PKG });
    const offenders = files.filter((f) => /LEAD_ACTION_EVENTS/u.test(readFileSync(resolve(PKG, f), "utf-8")));
    expect(offenders).toEqual([]);
  });
});
