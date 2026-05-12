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
    const offenders = files.filter((f) => /from\s+["']recharts["']/.test(readFileSync(resolve(PKG, f), "utf8")));
    expect(offenders).toEqual([]);
  });

  it("no @heroicons or react-icons imports anywhere in AnalyticsView", async () => {
    const files = await glob(`${COMPONENTS_DIR}/**/*.{ts,tsx}`, { cwd: PKG });
    const offenders = files.filter((f) => {
      const src = readFileSync(resolve(PKG, f), "utf8");
      return /@heroicons|react-icons/.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it("no process.env reads inside AnalyticsView components", async () => {
    const files = await glob(`${COMPONENTS_DIR}/**/*.{ts,tsx}`, { cwd: PKG });
    const offenders = files.filter((f) => /process\.env/.test(readFileSync(resolve(PKG, f), "utf8")));
    expect(offenders).toEqual([]);
  });

  it("no router.replace or router.push outside useAnalyticsParams.ts", async () => {
    const files = await glob(`${COMPONENTS_DIR}/**/*.{ts,tsx}`, {
      cwd: PKG,
      ignore: [`${COMPONENTS_DIR}/hooks/useAnalyticsParams.ts`],
    });
    const offenders = files.filter((f) => {
      const src = readFileSync(resolve(PKG, f), "utf8");
      return /router\.(replace|push)\b/.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it("no services/ or endpoints/ imports from AnalyticsView", async () => {
    const files = await glob(`${COMPONENTS_DIR}/**/*.{ts,tsx}`, { cwd: PKG });
    const offenders = files.filter((f) => {
      const src = readFileSync(resolve(PKG, f), "utf8");
      return /from\s+["']\.\.\/\.\.\/services|from\s+["']\.\.\/\.\.\/\.\.\/services|from\s+["']\.\.\/\.\.\/endpoints/.test(
        src,
      );
    });
    expect(offenders).toEqual([]);
  });

  it("getLeadActionIcon is the only file mapping LeadActionKind -> LucideIcon", async () => {
    const files = await glob(`${COMPONENTS_DIR}/**/*.{ts,tsx}`, {
      cwd: PKG,
      ignore: [`${COMPONENTS_DIR}/icons/getLeadActionIcon.ts`],
    });
    const offenders = files.filter((f) => {
      const src = readFileSync(resolve(PKG, f), "utf8");
      return /"phone_click":|'phone_click':/.test(src) && /Lucide/.test(src);
    });
    expect(offenders).toEqual([]);
  });
});
