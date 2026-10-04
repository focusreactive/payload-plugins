import type { SeedContext } from "./context";
import { CATEGORIES } from "./data/categories";
import { log } from "./log";
import { slugify } from "./text";

const DEMO_EMAILS = ["admin@ct.demo", "editor@ct.demo", "author@ct.demo"];

/**
 * `reset`: deletes what the seed owns — imported posts (they carry a sourceUrl), the authors of the
 * dump, the seed's categories and the demo editor/author accounts (the admin account is kept so the
 * session running the seed is not locked out). Media stay: they are matched by file name and reused.
 */
export async function resetSeed(ctx: SeedContext): Promise<void> {
  const { payload } = ctx;
  const context = ctx.writeContext;

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

  const categories = await payload.delete({
    collection: "categories",
    context,
    where: { slug: { in: CATEGORIES.map((category) => category.slug) } },
  });
  log.info(`deleted ${categories.docs.length} categories`);

  const users = await payload.delete({
    collection: "users",
    context,
    where: { email: { in: DEMO_EMAILS.filter((email) => email !== "admin@ct.demo") } },
  });
  log.info(`deleted ${users.docs.length} demo users`);
}
