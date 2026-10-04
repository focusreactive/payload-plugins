import { writeFile } from "node:fs/promises";
import path from "node:path";

import { emptyResult } from "./context";
import type { SeedStep } from "./context";
import { buildLegacyMap } from "./legacyMap";
import { log } from "./log";
import { pageIdByPath } from "./links";

/** A few editorial redirects so the CMS collection is not empty; the static map does the bulk. */
const EDITORIAL = [
  { from: "/trustable.html", to: "/technology/trustable-software" },
  { from: "/ctrl-os.html", to: "/technology/ctrl-os" },
  { from: "/ct-at-ces.html", to: "/ces-2026" },
];

/** Git-ignored: old slugs carry the client's name. next.config.mjs aliases it as @ct/legacy-map. */
export const LEGACY_JSON = path.resolve(process.cwd(), "src/lib/redirects/legacy.local.json");

export const seedRedirects: SeedStep = async (ctx) => {
  const result = emptyResult();

  // Authors of every post in the dump get their old page mapped (it is cheap and complete).
  const authors = [...new Set(ctx.posts.map((post) => post.author))];
  const map = buildLegacyMap(ctx.site.pages, ctx.posts, authors);
  await writeFile(LEGACY_JSON, `${JSON.stringify(map, null, 2)}\n`);
  log.info(
    `legacy.local.json: ${Object.keys(map).length} entries (rebuild to apply; not committed)`
  );

  for (const entry of EDITORIAL) {
    const found = await ctx.payload.find({
      collection: "redirects",
      limit: 1,
      where: { from: { equals: entry.from } },
    });
    if (found.docs[0]) {
      result.skipped++;
      continue;
    }
    const pageId = await pageIdByPath(ctx, entry.to);
    await ctx.payload.create({
      collection: "redirects",
      context: ctx.writeContext,
      data: {
        from: entry.from,
        isActive: true,
        to: pageId
          ? { reference: { relationTo: "page", value: pageId }, type: "reference" }
          : { type: "custom", url: entry.to },
        type: "308",
      },
    });
    result.created++;
  }

  result.note = `${Object.keys(map).length} legacy URLs`;
  return result;
};
