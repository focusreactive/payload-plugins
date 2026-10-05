import type { SeedContext } from "./context";
import { TAGS } from "./data/tags";
import { IA } from "./data/ia";
import { log } from "./log";
import { SCHEDULED_POST_SLUG } from "./seedWorkflow";
import { slugify } from "./text";

const DEMO_EMAILS = ["admin@ct.demo", "editor@ct.demo", "author@ct.demo"];

/**
 * `reset`: deletes what the seed owns — imported posts (they carry a sourceUrl), the authors of the
 * dump, the seed's tags, the IA pages, the demo comments and scheduled post, and the demo editor/author accounts (the admin account is kept so the
 * session running the seed is not locked out). Media stay: they are matched by file name and reused.
 */
export async function resetSeed(ctx: SeedContext): Promise<void> {
  const { payload } = ctx;
  const context = ctx.writeContext;

  const scheduled = await payload.find({
    collection: "posts",
    depth: 0,
    draft: true,
    limit: 1,
    where: { slug: { equals: SCHEDULED_POST_SLUG } },
  });
  for (const post of scheduled.docs) {
    const jobs = await payload.find({
      collection: "payload-jobs",
      depth: 0,
      limit: 100,
      where: { completedAt: { exists: false }, taskSlug: { equals: "schedulePublish" } },
    });
    const ids = jobs.docs
      .filter((job) => (job.input as { doc?: { value?: number } } | null)?.doc?.value === post.id)
      .map((job) => job.id);
    if (ids.length > 0) {
      await payload.delete({ collection: "payload-jobs", where: { id: { in: ids } } });
    }
    await payload.delete({ collection: "posts", context, id: post.id });
  }
  log.info(`deleted ${scheduled.docs.length} scheduled demo post`);

  const comments = await payload.delete({
    collection: "comments",
    context,
    where: { "author.email": { in: DEMO_EMAILS } },
  });
  log.info(`deleted ${comments.docs.length} demo comments`);

  const posts = await payload.delete({
    collection: "posts",
    context,
    where: { sourceUrl: { exists: true } },
  });
  log.info(`deleted ${posts.docs.length} imported posts`);

  const authors = await payload.delete({
    collection: "authors",
    context,
    where: { slug: { in: ctx.site.authors.map(slugify) } },
  });
  log.info(`deleted ${authors.docs.length} authors`);

  const tags = await payload.delete({
    collection: "tags",
    context,
    where: { slug: { in: TAGS.map((tag) => tag.slug) } },
  });
  log.info(`deleted ${tags.docs.length} tags`);

  const pages = await payload.delete({
    collection: "page",
    context,
    where: { slug: { in: IA.map((page) => page.slug) } },
  });
  log.info(`deleted ${pages.docs.length} pages`);

  const users = await payload.delete({
    collection: "users",
    context,
    where: { email: { in: DEMO_EMAILS.filter((email) => email !== "admin@ct.demo") } },
  });
  log.info(`deleted ${users.docs.length} demo users`);
}
