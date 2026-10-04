/**
 * CT demo seed — `bun run seed:ct [flags]` (see README.md in this folder).
 *
 *   source=<file>         content dump (default .local/ct/content-dump.md)
 *   only=a,b              steps: media,taxonomy,users,posts,pages,chrome,redirects,presets
 *   limit-posts=N         seed only the first N selected posts (dry runs)
 *   all-posts             all 191 posts instead of the 40-post selection
 *   reset                 delete what this seed owns before seeding
 *   rebuild-pages         re-run the page recipes over existing pages
 *
 * (`payload run` swallows `--flags`, hence `name=value`.)
 *
 * Idempotent: everything is upserted by slug / sourceUrl / email / name.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getPayloadClient } from "@/dal";

import { emptyResult, STEP_ORDER } from "./context";
import type { SeedContext, SeedFlags, SeedStep, StepName, StepResult } from "./context";
import { log } from "./log";
import { parseDump, selectPosts } from "./parseDump";
import { resetSeed } from "./reset";
import { STEPS } from "./steps";
import type { ImagesMap, ParsedSite } from "./types";

/**
 * `payload run` forwards only positional arguments (it parses `--flags` itself), so flags are
 * written `name=value` or as a bare `name`; `--name value` also works when run directly.
 */
function flag(name: string): string | undefined {
  const argv = process.argv.slice(2);
  for (const [index, arg] of argv.entries()) {
    const bare = arg.replace(/^--/u, "");
    if (bare === name) {
      const next = argv[index + 1];
      return arg.startsWith("--") && next && !next.startsWith("--") && !next.includes("=")
        ? next
        : "true";
    }
    if (bare.startsWith(`${name}=`)) {
      return bare.slice(name.length + 1);
    }
  }
  return undefined;
}

function readFlags(): SeedFlags {
  const localDir = path.resolve(process.cwd(), ".local/ct");
  const only = flag("only")
    ?.split(",")
    .map((step) => step.trim())
    .filter(Boolean) as StepName[] | undefined;
  for (const step of only ?? []) {
    if (!STEP_ORDER.includes(step)) {
      throw new Error(`Unknown step "${step}". Steps: ${STEP_ORDER.join(", ")}`);
    }
  }
  const limit = flag("limit-posts");
  return {
    allPosts: flag("all-posts") === "true",
    limitPosts: limit ? Number.parseInt(limit, 10) : null,
    localDir,
    only: only ?? STEP_ORDER,
    rebuildPages: flag("rebuild-pages") === "true",
    reset: flag("reset") === "true",
    source: path.resolve(process.cwd(), flag("source") ?? path.join(localDir, "content-dump.md")),
  };
}

async function loadSite(flags: SeedFlags): Promise<ParsedSite> {
  if (!existsSync(flags.source)) {
    throw new Error(
      `Content dump not found at ${flags.source}. Put it at .local/ct/content-dump.md (see README.md).`
    );
  }
  const site = parseDump(await readFile(flags.source, "utf-8"));
  await mkdir(flags.localDir, { recursive: true });
  await writeFile(path.join(flags.localDir, "parsed.json"), JSON.stringify(site, null, 2));
  return site;
}

async function loadImagesMap(flags: SeedFlags): Promise<ImagesMap | null> {
  const file = path.join(flags.localDir, "images-map.json");
  if (!existsSync(file)) {
    log.warn("images-map.json not found — posts get generated covers and no inline images.");
    return null;
  }
  return JSON.parse(await readFile(file, "utf-8")) as ImagesMap;
}

async function main() {
  const flags = readFlags();
  log.step(`CT seed — steps: ${flags.only.join(", ")}`);

  const site = await loadSite(flags);
  let posts = selectPosts(site.posts, { all: flags.allPosts });
  if (flags.limitPosts !== null) {
    posts = posts.slice(0, flags.limitPosts);
  }
  log.info(
    `parsed ${site.pages.length} pages, ${site.posts.length} posts, ${site.authors.length} authors; seeding ${posts.length} posts`
  );

  const payload = await getPayloadClient();
  const ctx: SeedContext = {
    flags,
    ids: {
      authors: new Map(),
      categories: new Map(),
      media: new Map(),
      pages: new Map(),
      posts: new Map(),
    },
    imagesMap: await loadImagesMap(flags),
    payload,
    posts,
    site,
    writeContext: { disableRevalidate: true },
  };

  if (flags.reset) {
    log.step("reset");
    await resetSeed(ctx);
  }

  const summary: Record<string, string | number>[] = [];
  for (const name of STEP_ORDER) {
    if (!flags.only.includes(name)) {
      continue;
    }
    log.step(name);
    const step: SeedStep | undefined = STEPS[name];
    const result: StepResult = step
      ? await step(ctx)
      : { ...emptyResult(), note: "not implemented" };
    summary.push({ step: name, ...result, note: result.note ?? "" });
  }

  log.step("summary");
  log.table(summary);
}

try {
  await main();
  process.exit(0);
} catch (error) {
  log.warn(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exit(1);
}
