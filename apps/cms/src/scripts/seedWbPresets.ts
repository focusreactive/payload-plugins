import fs from "node:fs";
import path from "node:path";

import { getPayload } from "payload";
import config from "@payload-config";

// Seeds one block preset per WealthBriefing block, using the live home page's
// block content as the preset payload and a per-section screenshot as the
// preview image. Idempotent: re-running updates presets (matched by name) and
// reuses screenshots already stored in Vercel Blob. Run:
//   bun run payload run src/scripts/seedWbPresets.ts

const SHOTS = path.resolve(process.cwd(), "public/wb/presets");

// blockType -> preset name shown in the admin preset picker.
const PRESET_LABELS: Record<string, string> = {
  wbHero: "WB Hero",
  wbAwards: "WB Awards",
  wbEvents: "WB Events",
  wbBrands: "WB Brand Worlds",
  wbResearch: "WB Research",
  wbPeople: "WB People Moves",
  wbFeatured: "WB Featured",
  wbNews: "WB Latest News",
  wbAnalysis: "WB Comment & Analysis",
  wbMoreRead: "WB More Stories",
  wbSponsors: "WB Sponsors",
  wbSubscribe: "WB Subscribe",
};

async function main() {
  const payload = await getPayload({ config });

  // Upload a preset screenshot to Media (idempotent by alt); returns its id or
  // null when the screenshot file isn't present yet.
  async function uploadShot(blockType: string): Promise<number | null> {
    const file = path.join(SHOTS, `preset-${blockType}.png`);
    if (!fs.existsSync(file)) {
      return null;
    }
    const alt = `WB preset preview — ${blockType}`;
    const existing = await payload.find({
      collection: "media",
      where: { alt: { equals: alt } },
      limit: 1,
    });
    const prev = existing.docs[0];
    if (prev) {
      if (typeof prev.url === "string" && prev.url.includes("vercel-storage.com")) {
        return prev.id as number;
      }
      await payload.delete({ collection: "media", id: prev.id });
    }
    const doc = await payload.create({ collection: "media", data: { alt }, filePath: file });
    return doc.id as number;
  }

  const home = await payload.find({
    collection: "page",
    where: { slug: { equals: "home" } },
    depth: 0,
    limit: 1,
    locale: "en",
  });
  const blocks = (home.docs[0]?.blocks ?? []) as unknown as Array<Record<string, unknown>>;

  let created = 0;
  for (const block of blocks) {
    const blockType = block.blockType as string;
    const label = PRESET_LABELS[blockType];
    if (!label) {
      continue;
    }

    // The preset payload is the block's own field data, minus Payload internals.
    const { id: _id, blockName: _blockName, experiment: _experiment, ...fields } = block;
    const preview = await uploadShot(blockType);

    const found = await payload.find({
      collection: "presets",
      where: { name: { equals: label } },
      limit: 1,
      locale: "en",
    });
    const data = {
      name: label,
      ...(preview ? { preview } : {}),
      // Dynamic block payload; the collection validates the block shape at runtime.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      presetBlock: [{ blockType, ...fields }] as any,
    };
    if (found.docs[0]) {
      await payload.update({ collection: "presets", id: found.docs[0].id, data, locale: "en" });
    } else {
      await payload.create({ collection: "presets", data, locale: "en" });
    }
    created += 1;
  }

  // Prune stale presets left over from removed (non-WB) blocks.
  const wbTypes = new Set(Object.keys(PRESET_LABELS));
  const all = await payload.find({ collection: "presets", depth: 0, limit: 200 });
  let pruned = 0;
  for (const preset of all.docs) {
    const blockType = (preset.presetBlock?.[0] as { blockType?: string })?.blockType;
    if (!(blockType && wbTypes.has(blockType))) {
      await payload.delete({ collection: "presets", id: preset.id });
      pruned += 1;
    }
  }

  payload.logger.info(`Seeded ${created} WealthBriefing block presets; pruned ${pruned} stale`);
}

try {
  await main();
  process.exit(0);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
}
