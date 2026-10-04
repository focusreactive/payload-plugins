import { emptyResult } from "./context";
import type { SeedStep } from "./context";
import { assignCategories, CATEGORIES } from "./data/categories";
import { renderAvatar } from "./imagery";
import { upsertMedia } from "./mediaStore";
import { slugify } from "./text";

/** Categories (11) and the authors referenced by the seeded posts (plan T7 §3–4). */
export const seedTaxonomy: SeedStep = async (ctx) => {
  const result = emptyResult();

  for (const category of CATEGORIES) {
    const found = await ctx.payload.find({
      collection: "categories",
      limit: 1,
      where: { slug: { equals: category.slug } },
    });
    const id =
      found.docs[0]?.id ??
      (
        await ctx.payload.create({
          collection: "categories",
          context: ctx.writeContext,
          data: { generateSlug: false, slug: category.slug, title: category.title },
        })
      ).id;
    result[found.docs[0] ? "skipped" : "created"]++;
    ctx.ids.categories.set(category.slug, id);
  }

  // Top category per author → one-line bio.
  const topics = new Map<string, Map<string, number>>();
  for (const post of ctx.posts) {
    const counts = topics.get(post.author) ?? new Map<string, number>();
    for (const slug of assignCategories(post)) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    topics.set(post.author, counts);
  }
  const company = ctx.site.companyName ?? "CT";

  for (const [name, counts] of topics) {
    const slug = slugify(name);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const topic = CATEGORIES.find((category) => category.slug === top)?.title ?? "Engineering";
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
      filename: `avatar-${slug}.png`,
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
