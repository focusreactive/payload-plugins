import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { clientComponentPath } from "../../shared/utils/componentPath.js";

/**
 * Hosts reach these components through Payload's import map, which only fails when the admin
 * renders. Read as text: the targets import `@payloadcms/ui`, which vitest cannot load.
 */
const CLIENT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PATH_PREFIX = clientComponentPath("");

const COMPONENT_PATH = /clientComponentPath\(\s*["']([^"']+)["']\s*,?\s*\)/gu;
const EXPORT_NAME = /exportName\s*[=:]\s*["']([^"']+)["']/u;

/** `__tests__`, `__mocks__` and the lint probe's folders never ship. */
const NOT_SHIPPED = /^__.*__$/u;

const exportFilesIn = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (NOT_SHIPPED.test(entry.name)) return [];
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return exportFilesIn(full);
    return /\.export\.tsx?$/u.test(entry.name) ? [full] : [];
  });

const exportsComponent = (source: string, exportName: string | undefined): boolean => {
  if (!exportName) return /\bexport\s+default\b/u.test(source);
  return new RegExp(
    `\\bexport\\s+(?:async\\s+)?(?:function|const|class)\\s+${exportName}\\b|\\bexport\\s*\\{[^}]*\\b${exportName}\\b[^}]*\\}`,
    "u"
  ).test(source);
};

const resolveTarget = (componentPath: string): string | undefined =>
  [".tsx", ".ts"].map((ext) => join(CLIENT, componentPath + ext)).find((file) => existsSync(file));

describe("every component path a host's import map names", () => {
  const files = exportFilesIn(CLIENT);

  it("has export classes to check", () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  it.each(files.map((file) => [relative(CLIENT, file), file]))(
    "%s points at a file exporting its component",
    (_label, file) => {
      const source = readFileSync(file, "utf-8");
      const paths = [...source.matchAll(COMPONENT_PATH)].map((m) => m[1] as string);
      const exportName = EXPORT_NAME.exec(source)?.[1];

      expect(paths, "an export class names its component through clientComponentPath").toHaveLength(
        1
      );
      const target = resolveTarget(paths[0] as string);
      expect(target, `${PATH_PREFIX}${paths[0]} has no source file`).toBeDefined();
      expect(exportsComponent(readFileSync(target as string, "utf-8"), exportName)).toBe(true);
    }
  );
});
