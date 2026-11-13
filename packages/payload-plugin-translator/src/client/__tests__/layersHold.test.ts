import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Lint sees an import specifier only as text, so `../../other-feature` passes every glob. This scan
 * resolves each relative import to the file it reaches and checks the layer order on that.
 */
const CLIENT = join(dirname(fileURLToPath(import.meta.url)), "..");

const LAYERS = ["shared", "entities", "features", "widgets", "app"] as const;
type Layer = (typeof LAYERS)[number];

/** A path relative to `src/client`, `/`-separated. */
type ClientPath = string;

type Edge = { from: ClientPath; to: ClientPath; typeOnly: boolean };

const STATIC_IMPORT = /\b(?:import|export)\s+(type\s+)?(?:[^;"']*?\s+from\s+)?["']([^"']+)["']/gu;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*["']([^"']+)["']/gu;

const placeOf = (path: ClientPath): { layer: Layer; slice: string } | null => {
  const [first, second = ""] = path.split("/");
  const layer = LAYERS.find((l) => l === first);
  return layer ? { layer, slice: second } : null;
};

const SLICED_LAYERS: ReadonlySet<Layer> = new Set(["features", "widgets"]);

/** Why the edge breaks the layer order, or `null` when it holds. */
function layerViolation({ from, to, typeOnly }: Edge): string | null {
  const source = placeOf(from);
  const target = placeOf(to);
  if (!source || !target) return null;
  const sourceRank = LAYERS.indexOf(source.layer);
  const targetRank = LAYERS.indexOf(target.layer);
  if (targetRank > sourceRank) return `${source.layer} imports upward into ${target.layer}`;
  if (targetRank < sourceRank || source.slice === target.slice) return null;
  if (SLICED_LAYERS.has(source.layer)) {
    return `${source.layer} slice ${source.slice} imports its sibling ${target.slice}`;
  }
  if (source.layer === "entities" && !typeOnly) {
    return `entity ${source.slice} imports a value from entity ${target.slice}`;
  }
  return null;
}

/** `__tests__`, `__mocks__` and the lint probe's folders never ship. */
const NOT_SHIPPED = /^__.*__$/u;

const shippedFilesIn = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (NOT_SHIPPED.test(entry.name)) return [];
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return shippedFilesIn(full);
    return /\.tsx?$/u.test(entry.name) ? [full] : [];
  });

const toClientPath = (absolute: string): ClientPath =>
  relative(CLIENT, absolute).split(sep).join("/");

const edgesOf = (file: string): Edge[] => {
  const source = readFileSync(file, "utf-8");
  const found = [
    ...[...source.matchAll(STATIC_IMPORT)].map((m) => ({ spec: m[2] as string, typeOnly: !!m[1] })),
    ...[...source.matchAll(DYNAMIC_IMPORT)].map((m) => ({ spec: m[1] as string, typeOnly: false })),
  ];
  return found
    .filter(({ spec }) => spec.startsWith("."))
    .map(({ spec, typeOnly }) => ({
      from: toClientPath(file),
      to: toClientPath(resolve(dirname(file), spec)),
      typeOnly,
    }));
};

describe("the client layers hold", () => {
  it("names an upward edge and a sibling edge, and lets a downward one through", () => {
    expect(
      layerViolation({
        from: "entities/translation/api/a.ts",
        to: "app/config/index.js",
        typeOnly: false,
      })
    ).toMatch(/upward/u);
    expect(
      layerViolation({ from: "features/a/ui/A.tsx", to: "features/b/index.js", typeOnly: false })
    ).toMatch(/sibling/u);
    expect(
      layerViolation({ from: "widgets/a/ui/A.tsx", to: "widgets/b/index.js", typeOnly: true })
    ).toMatch(/sibling/u);
    expect(
      layerViolation({
        from: "entities/a/model/a.ts",
        to: "entities/b/model/b.js",
        typeOnly: false,
      })
    ).toMatch(/entity/u);
    expect(
      layerViolation({ from: "entities/a/model/a.ts", to: "entities/b/model/b.js", typeOnly: true })
    ).toBeNull();
    expect(
      layerViolation({ from: "widgets/a/ui/A.tsx", to: "features/b/index.js", typeOnly: false })
    ).toBeNull();
  });

  const files = LAYERS.flatMap((layer) => shippedFilesIn(join(CLIENT, layer)));

  it("has client files to scan", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("has no edge against the layer order", () => {
    const broken = files
      .flatMap(edgesOf)
      .map((edge) => ({ edge, why: layerViolation(edge) }))
      .filter(({ why }) => why !== null)
      .map(({ edge, why }) => `${edge.from} → ${edge.to}: ${why}`);

    expect(broken).toEqual([]);
  });
});
