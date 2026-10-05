import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { emptyResult } from "./context";
import type { SeedContext, SeedStep, StepResult } from "./context";
import { assignTags, TAGS } from "./data/tags";
import { renderCover } from "./imagery";
import { log } from "./log";
import { insertImages } from "./markdownImages";
import { articleSlug, isNewsEntry, slugFromUrl } from "./parseDump";
import { restoreCodeAndTables } from "./restoreCode";
import type { ImageInsert } from "./markdownImages";
import { upsertMedia } from "./mediaStore";
import { firstParagraph, londonMorning, slugify } from "./text";
import type { MappedImage, MappedPost, ParsedPost } from "./types";

const ACTIVE_SVG = /<(?:foreignObject|script|iframe|embed|object)\b|\son[a-z]+\s*=/iu;

const sameUrl = (a: string, b: string) => a.replace(/\/+$/u, "") === b.replace(/\/+$/u, "");

/** og:image files shared by many posts are the site default, not a post cover (content doc §3). */
function sharedSha1s(posts: MappedPost[]): Set<string> {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const image of post.images) {
      if (image.sha1) {
        counts.set(image.sha1, (counts.get(image.sha1) ?? 0) + 1);
      }
    }
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 2).map(([sha1]) => sha1));
}

async function uploadMapped(
  ctx: SeedContext,
  post: ParsedPost,
  image: MappedImage
): Promise<{ id: number; url: string } | null> {
  if (!image.local) {
    return null;
  }
  const file = path.join(ctx.flags.localDir, image.local);
  if (!existsSync(file)) {
    log.warn(`${post.slug}: mapped image missing on disk (${image.local})`);
    return null;
  }
  const name = slugify(path.basename(image.local, path.extname(image.local))) || "image";
  let data = await readFile(file);
  let extension = path.extname(image.local).toLowerCase();
  // Payload rejects SVGs with active content; draw.io exports carry <foreignObject> labels (with a
  // plain <text> fallback). Rasterise those instead of weakening the upload check.
  if (extension === ".svg" && ACTIVE_SVG.test(data.toString("utf-8"))) {
    data = await sharp(data, { density: 144 })
      .resize({ width: 1600, withoutEnlargement: true })
      .png()
      .toBuffer();
    extension = ".png";
  }
  const { id, url } = await upsertMedia(ctx, {
    alt: image.alt || post.title,
    data,
    filename: `article-${post.slug}-${name}${extension}`,
    folder: "Articles",
  });
  return { id, url };
}

async function generatedCover(
  ctx: SeedContext,
  post: ParsedPost,
  eyebrow: string
): Promise<number> {
  const cacheDir = path.join(ctx.flags.localDir, "covers");
  const cacheFile = path.join(cacheDir, `${post.slug}.jpg`);
  let data: Buffer;
  if (existsSync(cacheFile)) {
    data = await readFile(cacheFile);
  } else {
    data = await renderCover({ eyebrow, slug: post.slug, title: post.title });
    await mkdir(cacheDir, { recursive: true });
    await writeFile(cacheFile, new Uint8Array(data));
  }
  const { id } = await upsertMedia(ctx, {
    alt: post.title,
    data,
    filename: `cover-${post.slug}.jpg`,
    folder: "Covers",
  });
  return id;
}

/** Code listings and tables come back from the scraped article HTML when it is on disk. */
async function withRestoredCode(ctx: SeedContext, post: ParsedPost): Promise<string> {
  const file = path.join(ctx.flags.localDir, "html", `${slugFromUrl(post.url)}.html`);
  if (!existsSync(file)) {
    return post.markdown;
  }
  const { markdown, restored } = restoreCodeAndTables(post.markdown, await readFile(file, "utf-8"));
  if (restored > 0) {
    log.info(`${post.slug}: ${restored} code blocks / tables restored from HTML`);
  }
  return markdown;
}

/** A press release keeps its old address: /news/<name>.html → News slug "<name>.html". */
async function upsertNews(ctx: SeedContext, post: ParsedPost, result: StepResult) {
  const slug = post.legacyPath.split("/").pop() || `${post.slug}.html`;
  const excerpt = firstParagraph(post.markdown) || post.title;
  const data = {
    _status: "published" as const,
    content: null,
    excerpt,
    generateSlug: false,
    markdown: post.markdown,
    meta: { description: excerpt, robots: "index" as const, title: post.titleTag ?? post.title },
    publishedAt: londonMorning(post.date),
    slug,
    title: post.title,
  };
  const found = await ctx.payload.find({
    collection: "news",
    draft: false,
    limit: 1,
    where: { slug: { equals: slug } },
  });
  const existing = found.docs[0];
  if (!existing) {
    await ctx.payload.create({ collection: "news", context: ctx.writeContext, data });
    result.created++;
  } else if (existing.markdown !== post.markdown || existing.title !== post.title) {
    await ctx.payload.update({
      collection: "news",
      context: ctx.writeContext,
      data,
      id: existing.id,
    });
    result.updated++;
  } else {
    result.skipped++;
  }
}

export const seedPosts: SeedStep = async (ctx) => {
  const result = emptyResult();
  const mapped = ctx.imagesMap?.posts ?? [];
  const defaultImages = sharedSha1s(mapped);
  let imagesPlaced = 0;

  for (const post of ctx.posts) {
    if (isNewsEntry(post)) {
      await upsertNews(ctx, post, result);
      continue;
    }
    const tagSlugs = assignTags(post);
    const tagIds = tagSlugs
      .map((slug) => ctx.ids.tags.get(slug))
      .filter((id): id is number => id !== undefined);
    const authorId = ctx.ids.authors.get(post.author);
    if (tagIds.length === 0 || !authorId) {
      throw new Error(`${post.slug}: run the taxonomy step first (tags/authors missing)`);
    }
    const eyebrow = TAGS.find((tag) => tag.slug === tagSlugs[0])?.title ?? "";

    // Images from images-map.json (scraped from the live article).
    // By source URL: the post slug may have been renamed (avoidPageSlugs), the scraper's was not.
    const entry = mapped.find((item) => sameUrl(item.sourceUrl, post.url) && item.status === "ok");
    let markdown = await withRestoredCode(ctx, post);
    let coverId: number | null = null;
    if (entry) {
      const inserts: ImageInsert[] = [];
      for (const image of entry.images.filter((item) => item.kind === "inline")) {
        const uploaded = await uploadMapped(ctx, post, image);
        if (uploaded) {
          inserts.push({
            afterBlock: image.afterBlock,
            alt: image.alt || post.title,
            title: image.title,
            url: uploaded.url,
          });
          coverId ??= uploaded.id;
        }
      }
      const splash = entry.images.find((item) => item.kind === "splash");
      const og = entry.images.find(
        (item) => item.kind === "og" && !(item.sha1 && defaultImages.has(item.sha1))
      );
      const preferred = splash ? await uploadMapped(ctx, post, splash) : null;
      coverId =
        preferred?.id ?? coverId ?? (og ? ((await uploadMapped(ctx, post, og))?.id ?? null) : null);
      if (inserts.length > 0) {
        const placed = insertImages(markdown, inserts, entry.blockCount);
        if (placed.proportional) {
          log.warn(
            `${post.slug}: block counts differ (html ${entry.blockCount}); images placed proportionally`
          );
        }
        markdown = placed.markdown;
        imagesPlaced += inserts.length;
      }
    }
    coverId ??= await generatedCover(ctx, post, eyebrow);

    const excerpt = firstParagraph(post.markdown) || post.title;
    const data = {
      _status: "published" as const,
      authors: [authorId],
      tags: tagIds,
      content: null,
      excerpt,
      generateSlug: false,
      heroImage: coverId,
      legacyPath: post.legacyPath,
      markdown,
      meta: {
        description: excerpt,
        image: coverId,
        robots: "index" as const,
        title: post.titleTag ?? post.title,
      },
      publishedAt: londonMorning(post.date),
      slug: articleSlug(post),
      sourceUrl: post.url,
      title: post.title,
    };

    const found = await ctx.payload.find({
      collection: "posts",
      draft: false,
      limit: 1,
      where: { sourceUrl: { equals: post.url } },
    });
    const existing = found.docs[0];
    if (existing) {
      ctx.ids.posts.set(post.slug, existing.id);
      const changed =
        existing.slug !== articleSlug(post) ||
        existing.markdown !== markdown ||
        existing.title !== post.title ||
        existing.excerpt !== excerpt;
      if (changed) {
        await ctx.payload.update({
          collection: "posts",
          context: ctx.writeContext,
          data,
          id: existing.id,
        });
        result.updated++;
      } else {
        result.skipped++;
      }
      continue;
    }
    const doc = await ctx.payload.create({ collection: "posts", context: ctx.writeContext, data });
    ctx.ids.posts.set(post.slug, doc.id);
    result.created++;
  }

  result.note = ctx.imagesMap
    ? `${imagesPlaced} inline images placed`
    : "generated covers (no images map)";
  return result;
};
