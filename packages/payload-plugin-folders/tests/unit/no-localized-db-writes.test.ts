import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Spec section 3.2: the drizzle adapter deletes every locale row of a document on a write that
// carries localized data and re-inserts only the locales it was given, so a plugin write that
// names `pathSegment`, `slug` or `name` on a page would drop the locales it left out. Folder rows
// are the exception (build-lead decision 3): the folder writes carry every locale of
// all three columns, read with `locale: "all"`, so the scan covers page-side writes only.

const sourceDirectory = path.resolve(import.meta.dirname, "../../src");

const writeMethods = "updateOne|updateMany|updateVersion|create|createVersion|upsert";
const writeCallStart = new RegExp(`\\bdb\\.(?:${writeMethods})\\(`, "gu");
const localizedKey =
  /(?:["']?\b(?:pathSegment|slug|name)\b["']?\s*[:,}])|(?:\[[^\]]*segmentField[^\]]*\]\s*:)/u;
// A write whose `collection` is the folders collection, which carries every locale.
const folderCollection = /\bcollection:\s*toCollectionSlug\(\s*options\.folders\.slug\s*\)/u;

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/.*$/gmu, "");

/** The text of a call from its opening parenthesis to the matching closing one. */
const readCall = (source: string, openingIndex: number): string => {
  let depth = 0;
  for (let index = openingIndex; index < source.length; index += 1) {
    if (source[index] === "(") {
      depth += 1;
    } else if (source[index] === ")") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openingIndex, index + 1);
      }
    }
  }

  return source.slice(openingIndex);
};

type Scan = { folderWrites: number; offences: string[] };

const scanForLocalizedPageWrites = (source: string): Scan => {
  const code = stripComments(source);
  const scan: Scan = { folderWrites: 0, offences: [] };

  for (const match of code.matchAll(writeCallStart)) {
    const call = readCall(code, match.index + match[0].length - 1);
    if (folderCollection.test(call)) {
      scan.folderWrites += 1;
    } else if (localizedKey.test(call)) {
      scan.offences.push(`${match[0]}${call.replaceAll(/\s+/gu, " ").slice(0, 120)}`);
    }
  }

  return scan;
};

const listSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return /\.tsx?$/u.test(entry.name) ? [entryPath] : [];
  });

describe("no localized database writes outside the folders collection", () => {
  it("src/ has no payload.db write of pathSegment, slug or name on a page", () => {
    const scans = listSourceFiles(sourceDirectory).map((file) => ({
      file: path.relative(sourceDirectory, file),
      ...scanForLocalizedPageWrites(readFileSync(file, "utf-8")),
    }));

    expect(
      scans.flatMap((scan) => scan.offences.map((offence) => `${scan.file}: ${offence}`))
    ).toEqual([]);
    // The scan is not vacuous: it saw the folder subtree rewrite it deliberately skips.
    expect(
      scans.find((scan) => scan.file.endsWith("core/subtree.ts"))?.folderWrites
    ).toBeGreaterThan(0);
  });

  it("flags a page-side write that carries a localized column", () => {
    const withPathSegment = `await payload.db.updateOne({
      collection: toCollectionSlug(page.slug),
      data: { pathSegment: { de: "x" }, updatedAt },
      id,
    });`;
    const withShorthandSlug = `await req.payload.db.updateOne({ collection: "pages", data: { slug, orderKey }, id });`;
    const withComputedSegment = `await db.updateVersion({ versionData: { version: { [page.segmentField]: "x" } } });`;
    const withName = `await payload.db.create({ collection: "pages", data: { "name": "x" } });`;

    for (const source of [withPathSegment, withShorthandSlug, withComputedSegment, withName]) {
      expect(scanForLocalizedPageWrites(source).offences).toHaveLength(1);
    }
  });

  it("lets the folder write-back and structural page writes through", () => {
    const folderWrite = `await payload.db.updateOne({
      collection: toCollectionSlug(options.folders.slug),
      data: { fullPath: {}, name: {}, slug: {} },
      id: stored.id,
    });`;
    const structuralWrite = `await payload.db.updateOne({
      collection: toCollectionSlug(page.slug),
      data: { folder, orderKey, structureRevision, updatedAt },
      id,
    });`;
    const commented = `// payload.db.updateOne({ data: { pathSegment: "x" } })`;

    expect(scanForLocalizedPageWrites(folderWrite)).toEqual({ folderWrites: 1, offences: [] });
    expect(scanForLocalizedPageWrites(structuralWrite)).toEqual({ folderWrites: 0, offences: [] });
    expect(scanForLocalizedPageWrites(commented)).toEqual({ folderWrites: 0, offences: [] });
  });
});
