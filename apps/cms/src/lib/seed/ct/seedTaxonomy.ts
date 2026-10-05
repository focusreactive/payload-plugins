import { emptyResult } from "./context";
import type { SeedStep } from "./context";
import { assignTags, TAGS, tagDocSlug } from "./data/tags";
import { isNewsEntry } from "./parseDump";
import { renderAvatar } from "./imagery";
import { upsertMedia } from "./mediaStore";
import { slugify } from "./text";

/** Tags (11) and the authors referenced by the seeded posts (plan T7 §3–4). */
export const seedTaxonomy: SeedStep = async (ctx) => {
  const result = emptyResult();

  for (const tag of TAGS) {
    const found = await ctx.payload.find({
      collection: "tags",
      limit: 1,
      where: { slug: { equals: tagDocSlug(tag.slug) } },
    });
    const id =
      found.docs[0]?.id ??
      (
        await ctx.payload.create({
          collection: "tags",
          context: ctx.writeContext,
          data: { generateSlug: false, slug: tagDocSlug(tag.slug), title: tag.title },
        })
      ).id;
    result[found.docs[0] ? "skipped" : "created"]++;
    ctx.ids.tags.set(tag.slug, id);
  }

  // Top tag per author → one-line bio.
  const topics = new Map<string, Map<string, number>>();
  for (const post of ctx.posts.filter((entry) => !isNewsEntry(entry))) {
    const counts = topics.get(post.author) ?? new Map<string, number>();
    for (const slug of assignTags(post)) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    topics.set(post.author, counts);
  }
  const company = ctx.site.companyName ?? "CT";

  for (const [name, counts] of topics) {
    const base = slugify(name);
    const slug = `${base}.html`;
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const topic = TAGS.find((tag) => tag.slug === top)?.title ?? "Engineering";
    const bio =
      name === company
        ? `News and announcements from ${company}.`
        : `Writes about ${topic.toLowerCase()} at ${company}.`;

    const found = await ctx.payload.find({
      collection: "authors",
      limit: 1,
      where: { slug: { equals: slug } },
    });
    if (found.docs[0]) {
      ctx.ids.authors.set(name, found.docs[0].id);
      result.skipped++;
      continue;
    }
    const avatar = await upsertMedia(ctx, {
      alt: name,
      data: await renderAvatar(name),
      filename: `avatar-${base}.png`,
      folder: "Avatars",
    });
    const doc = await ctx.payload.create({
      collection: "authors",
      context: ctx.writeContext,
      data: { avatar: avatar.id, bio, generateSlug: false, name, slug },
    });
    ctx.ids.authors.set(name, doc.id);
    result.created++;
  }

  return result;
};
