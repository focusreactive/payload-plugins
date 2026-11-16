import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";

import { findEntities, idOf, orderByIds } from "@/dal/entities";
import { getPageBySlug } from "@/dal/getPageBySlug";
import { BLOG_CONFIG } from "@/lib/config/blog";
import { entityPath, withLocalePrefix } from "@/lib/config/entityRoutes";
import type { Locale } from "@/lib/types";
import type { Author, BlogHeroBlock, Category, Doctor, Media, Post } from "@/payload-types";

import { blogLabels } from "./labels";

export const blogIndexPath = (locale: string): string =>
  withLocalePrefix(BLOG_CONFIG.basePath, locale);

export const postPath = (post: Pick<Post, "slug">, locale: string): string =>
  withLocalePrefix(`${BLOG_CONFIG.basePath}/${stripMarkers(post.slug)}`, locale);

export const tagPath = (category: Pick<Category, "slug">, locale: string): string =>
  `${blogIndexPath(locale)}?tag=${encodeURIComponent(stripMarkers(category.slug) ?? "")}`;

export const postCategories = (post: Pick<Post, "categories">): Category[] =>
  (post.categories ?? []).filter(
    (category): category is Category => typeof category === "object" && category !== null
  );

export const postReadingTime = (
  post: Pick<Post, "readingTime" | "readingTimeOverride">
): number | null => post.readingTimeOverride ?? post.readingTime ?? null;

export interface PostByline {
  kind: "reviewer" | "author";
  /** The words before the name, for example Medically reviewed by. */
  label: string;
  /** The short name shown on cards. */
  name: string;
  /** The name with letters after it, shown on the article's top section. */
  fullName: string;
  photo: number | Media | null | undefined;
  /** The doctor's page, for a medical reviewer. */
  href?: string;
}

function doctorFullName(doctor: Doctor): string {
  const credentials = (doctor.credentials ?? []).filter(Boolean);

  return credentials.length > 0 ? `${doctor.name}, ${credentials.join(", ")}` : doctor.name;
}

/** The medical reviewer when the article has one, else its first author, as the site shows it. */
export function postByline(
  post: Pick<Post, "reviewedBy" | "authors">,
  locale: string
): PostByline | null {
  const labels = blogLabels(locale);
  const reviewer = typeof post.reviewedBy === "object" ? post.reviewedBy : null;

  if (reviewer) {
    const path = entityPath({ collection: "doctors", slug: stripMarkers(reviewer.slug) });

    return {
      fullName: doctorFullName(reviewer),
      href: path ? withLocalePrefix(path, locale) : undefined,
      kind: "reviewer",
      label: labels.reviewedBy,
      name: reviewer.name,
      photo: reviewer.photo,
    };
  }

  const author = (post.authors ?? []).find(
    (item): item is Author => typeof item === "object" && item !== null
  );

  if (!author) {
    return null;
  }

  const name = author.bylineName || author.name;

  return { fullName: name, kind: "author", label: labels.writtenBy, name, photo: author.avatar };
}

// Cards show the reviewer's photo, which sits two relations away from the article.
const CARD_DEPTH = 2;

/** Articles by hand-picked ids in the editor's order, or the newest ones when none are picked. */
export async function findPosts(
  locale: Locale,
  { picked, limit = 0 }: { picked?: (number | string | Post)[] | null; limit?: number }
): Promise<Post[]> {
  const ids = (picked ?? []).map(idOf);

  if (ids.length > 0) {
    const docs = await findEntities("posts", {
      depth: CARD_DEPTH,
      locale,
      where: { id: { in: ids } },
    });

    return orderByIds(docs, ids);
  }

  return findEntities("posts", { depth: CARD_DEPTH, limit, locale, sort: "-publishedAt" });
}

/** The article a blog top section features: the picked one, else the newest. */
export async function findFeaturedPost(
  picked: BlogHeroBlock["post"],
  locale: Locale
): Promise<Post | null> {
  const [post] = await findPosts(locale, { limit: 1, picked: picked ? [picked] : [] });

  return post ?? null;
}

/** The blog's name, logo and one-line description, kept on the blog page's top section. */
export interface BlogIdentity {
  title: string | null;
  logo: BlogHeroBlock["logo"];
  text: string | null;
  href: string;
  /** The article picked for the top section, which the articles list leaves out. */
  featured: BlogHeroBlock["post"];
}

export async function getBlogIdentity(locale: Locale): Promise<BlogIdentity> {
  const page = await getPageBySlug([BLOG_CONFIG.slug], locale);
  // The top section is a hero, but an editor may also have placed it among the sections.
  const blocks = [...(page?.hero ?? []), ...(page?.blocks ?? [])] as unknown as {
    blockType?: string;
  }[];
  const hero = blocks.find((block) => block.blockType === "blogHero") as BlogHeroBlock | undefined;

  return {
    featured: hero?.post,
    href: blogIndexPath(locale),
    logo: hero?.logo,
    text: hero?.text ?? null,
    title: hero?.heading ?? page?.title ?? null,
  };
}
