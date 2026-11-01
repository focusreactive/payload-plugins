import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type ExportTargets = { default: string; import: string; types: string };
type PackageJson = {
  exports: Record<string, ExportTargets>;
  main: string;
  publishConfig: { exports: Record<string, ExportTargets>; main: string; types: string };
  types: string;
};

const packageDirectory = path.resolve(import.meta.dirname, "../..");
const packageJson = JSON.parse(
  readFileSync(path.join(packageDirectory, "package.json"), "utf-8")
) as PackageJson;

/** What the build turns a source file into: tsup writes `.js` and tsc writes `.d.ts`, both under `dist`. */
const builtJavascript = (sourcePath: string): string =>
  sourcePath.replace(/^\.\/src\//u, "./dist/").replace(/\.tsx?$/u, ".js");
const builtTypes = (sourcePath: string): string =>
  sourcePath.replace(/^\.\/src\//u, "./dist/").replace(/\.tsx?$/u, ".d.ts");

describe("package.json exports", () => {
  it("publishConfig.exports has an entry for every source export and no other", () => {
    expect(Object.keys(packageJson.publishConfig.exports).toSorted()).toEqual(
      Object.keys(packageJson.exports).toSorted()
    );
  });

  it("every published entry points at the build of the source entry beside it", () => {
    for (const [entry, source] of Object.entries(packageJson.exports)) {
      expect(packageJson.publishConfig.exports[entry], entry).toEqual({
        default: builtJavascript(source.default),
        import: builtJavascript(source.import),
        types: builtTypes(source.types),
      });
    }
  });

  it("main and types follow the same rule, and every source entry exists", () => {
    expect(packageJson.publishConfig.main).toBe(builtJavascript(packageJson.main));
    expect(packageJson.publishConfig.types).toBe(builtTypes(packageJson.types));
    for (const [entry, source] of Object.entries(packageJson.exports)) {
      expect(existsSync(path.join(packageDirectory, source.import)), entry).toBe(true);
    }
  });
});
