import { generateNKeysBetween } from "payload/shared";
import { getPayload } from "payload";

import config from "./payload.config.js";
import { assertSeedAllowed } from "./seedGuard.js";

/**
 * Adds `DRAFT_PAGES_COUNT` draft pages to the folder `DRAFT_PAGES_FOLDER` (an id) of the database
 * `DATABASE_URI` points at, for the browser tests of the batched operations: 2,000 hooked creates
 * take minutes, so the pages are written with `foldersInternal`, as the archive seed does. Each has
 * a title, a segment and an order key, which is all the tree and a publish read.
 *
 * It only creates the pages the folder does not have yet, so running it again tops a short run up
 * (a run beside a live dev server on one SQLite file has been seen to end with fewer pages stored
 * than created, and the test helper runs it until the folder is complete).
 */
assertSeedAllowed();

const folder = Number(process.env.DRAFT_PAGES_FOLDER);
const count = Number(process.env.DRAFT_PAGES_COUNT);
const prefix = process.env.DRAFT_PAGES_PREFIX ?? "draft";
if (!Number.isInteger(folder) || !Number.isInteger(count) || count < 1) {
  throw new Error("Set DRAFT_PAGES_FOLDER (a folder id) and DRAFT_PAGES_COUNT (a number)");
}

const payload = await getPayload({ config });
const keys = generateNKeysBetween(null, null, count);
const segmentOf = (index: number): string => `${prefix}-${String(index + 1).padStart(4, "0")}`;

const { docs: existing } = await payload.find({
  collection: "pages",
  depth: 0,
  limit: count * 2,
  locale: "en",
  overrideAccess: true,
  pagination: false,
  select: { slug: true },
  where: { folder: { equals: folder } },
});
const have = new Set(existing.map((doc) => (doc as { slug?: string }).slug));

let created = 0;
for (let index = 0; index < count; index += 1) {
  if (have.has(segmentOf(index))) {
    continue;
  }
  await payload.create({
    collection: "pages",
    context: { foldersInternal: true },
    data: {
      _status: "draft",
      folder,
      orderKey: keys[index],
      pathSegment: segmentOf(index),
      slug: segmentOf(index),
      structureRevision: 0,
      title: `Draft page ${String(index + 1).padStart(4, "0")}`,
    } as never,
    depth: 0,
    draft: true,
    locale: "en",
    overrideAccess: true,
  });
  created += 1;
}

const stored = await payload.count({
  collection: "pages",
  overrideAccess: true,
  where: { folder: { equals: folder } },
});
payload.logger.info(
  `Created ${created} draft pages in folder ${folder}, ${stored.totalDocs} stored`
);
await payload.destroy();
process.exit(0);
