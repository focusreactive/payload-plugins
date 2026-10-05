import { emptyResult } from "./context";
import type { SeedContext, SeedStep, StepResult } from "./context";
import { NEWS_CATEGORY } from "./data/categories";
import { pageIdByPath } from "./links";
import { londonMorning } from "./text";

/** The draft news post that the seed schedules for tomorrow 09:00 (§5.7). */
export const SCHEDULED_POST_SLUG = "scheduled-news-demo";

const SCHEDULED_POST = {
  excerpt: "A short draft that publishes itself tomorrow morning — the scheduling demo.",
  markdown: [
    "This post was saved as a draft by the author and scheduled by the editor.",
    "",
    "Open it in the admin: the **Publish** menu shows the scheduled time, and the editor can move or",
    "cancel it. At 09:00 the scheduled-publish job publishes it and the blog, feeds and sitemap pick",
    "it up.",
  ].join("\n"),
  title: "Scheduled: tomorrow's news, published by the CMS",
};

type CommentTarget = "home" | "article";
interface SeedComment {
  target: CommentTarget;
  by: "author" | "editor";
  /** `@(<id>)` tokens are the plugin's mention format; `{author}`/`{editor}` become user ids. */
  text: string;
  mentions: ("author" | "editor")[];
}

/** Two threads with a mention on the home page and one note on an article (§5.7). */
export const SEED_COMMENTS: SeedComment[] = [
  {
    by: "author",
    mentions: ["editor"],
    target: "home",
    text: "@({editor}) the hero copy is updated in the draft — please review and publish.",
  },
  {
    by: "editor",
    mentions: ["author"],
    target: "home",
    text: "@({author}) reads well. I'll publish it together with tomorrow's scheduled news post.",
  },
  {
    by: "editor",
    mentions: [],
    target: "article",
    text: "Imported from the old site in Markdown. Check the inline images before we feature it.",
  },
];

async function userId(ctx: SeedContext, email: string): Promise<number | null> {
  const found = await ctx.payload.find({
    collection: "users",
    depth: 0,
    limit: 1,
    where: { email: { equals: email } },
  });
  return found.docs[0]?.id ?? null;
}

async function newestImportedPost(ctx: SeedContext) {
  const found = await ctx.payload.find({
    collection: "posts",
    depth: 0,
    limit: 1,
    sort: "-publishedAt",
    where: { sourceUrl: { exists: true } },
  });
  return found.docs[0] ?? null;
}

async function seedComments(
  ctx: SeedContext,
  users: Record<"author" | "editor", number>,
  result: StepResult
) {
  const home = await pageIdByPath(ctx, "/");
  const article = await newestImportedPost(ctx);
  const targets: Record<CommentTarget, { collection: string; id: number } | null> = {
    article: article ? { collection: "posts", id: article.id } : null,
    home: home ? { collection: "page", id: home } : null,
  };

  for (const comment of SEED_COMMENTS) {
    const target = targets[comment.target];
    if (!target) {
      continue;
    }
    const text = comment.text
      .replace("{author}", String(users.author))
      .replace("{editor}", String(users.editor));
    const existing = await ctx.payload.find({
      collection: "comments",
      depth: 0,
      limit: 1,
      where: {
        collectionSlug: { equals: target.collection },
        documentId: { equals: target.id },
        text: { equals: text },
      },
    });
    if (existing.docs[0]) {
      result.skipped++;
      continue;
    }
    await ctx.payload.create({
      collection: "comments",
      context: ctx.writeContext,
      data: {
        author: users[comment.by],
        collectionSlug: target.collection,
        documentId: target.id,
        isResolved: false,
        mentions: comment.mentions.map((who) => ({ user: users[who] })),
        text,
      },
    });
    result.created++;
  }
}

/** "YYYY-MM-DD" of tomorrow in London. */
function tomorrowInLondon(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(tomorrow);
}

async function pendingScheduleJobs(ctx: SeedContext, postId: number) {
  const jobs = await ctx.payload.find({
    collection: "payload-jobs",
    depth: 0,
    limit: 100,
    where: { completedAt: { exists: false }, taskSlug: { equals: "schedulePublish" } },
  });
  return jobs.docs.filter((job) => {
    const input = job.input as { doc?: { relationTo?: string; value?: number } } | null;
    return input?.doc?.relationTo === "posts" && input.doc.value === postId;
  });
}

async function seedScheduledPost(
  ctx: SeedContext,
  users: Record<"author" | "editor", number>,
  result: StepResult
) {
  const existing = await ctx.payload.find({
    collection: "posts",
    depth: 0,
    draft: true,
    limit: 1,
    where: { slug: { equals: SCHEDULED_POST_SLUG } },
  });
  let post = existing.docs[0];

  if (!post) {
    const [author, news, cover] = await Promise.all([
      ctx.payload.find({ collection: "authors", depth: 0, limit: 1, sort: "name" }),
      ctx.payload.find({
        collection: "categories",
        depth: 0,
        limit: 1,
        where: { slug: { equals: NEWS_CATEGORY } },
      }),
      newestImportedPost(ctx),
    ]);
    post = await ctx.payload.create({
      collection: "posts",
      context: ctx.writeContext,
      data: {
        _status: "draft",
        authors: author.docs[0] ? [author.docs[0].id] : [],
        categories: news.docs[0] ? [news.docs[0].id] : [],
        content: null,
        excerpt: SCHEDULED_POST.excerpt,
        generateSlug: false,
        heroImage: typeof cover?.heroImage === "number" ? cover.heroImage : undefined,
        markdown: SCHEDULED_POST.markdown,
        slug: SCHEDULED_POST_SLUG,
        title: SCHEDULED_POST.title,
      },
      draft: true,
    });
    result.created++;
  }

  if ((await pendingScheduleJobs(ctx, post.id)).length > 0) {
    result.skipped++;
    return;
  }

  const waitUntil = londonMorning(tomorrowInLondon());
  await ctx.payload.update({
    collection: "posts",
    context: ctx.writeContext,
    data: { publishedAt: waitUntil },
    draft: true,
    id: post.id,
  });
  // Same job the admin's "Schedule publish" drawer queues (payload/ui schedulePublishHandler).
  await ctx.payload.jobs.queue({
    input: {
      doc: { relationTo: "posts", value: post.id },
      type: "publish",
      user: { relationTo: "users", value: users.editor },
    },
    task: "schedulePublish",
    waitUntil: new Date(waitUntil),
  });
  result.updated++;
  result.note = `scheduled post publishes ${waitUntil}`;
}

/** §5.7 editorial demo state: comment threads with mentions and one scheduled draft. */
export const seedWorkflow: SeedStep = async (ctx) => {
  const result = emptyResult();
  const [author, editor] = await Promise.all([
    userId(ctx, "author@ct.demo"),
    userId(ctx, "editor@ct.demo"),
  ]);
  if (!author || !editor) {
    result.note = "demo users missing — run the users step first";
    return result;
  }
  const users = { author, editor };
  await seedComments(ctx, users, result);
  await seedScheduledPost(ctx, users, result);
  return result;
};
