import { SectionHeader } from "@/components/SectionHeader";
import { SectionContainer } from "@/components/shared";
import { getPayloadClient, getPosts } from "@/dal";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import { BLOG_CONFIG } from "@/lib/config/blog";
import type { Locale } from "@/lib/types";
import { formatPostDate } from "@/lib/utils/formatPostDate";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Author, Tag, Media, Post, PostsListBlock } from "@/payload-types";

import { PostsList } from "./ui";
import type { PostsListItem, PostsListLayout } from "./ui/types";

type ListedPost = Pick<
  Post,
  "slug" | "title" | "excerpt" | "heroImage" | "tags" | "authors" | "publishedAt" | "readingTime"
>;

export function toPostsListItem(post: ListedPost, locale: Locale): PostsListItem {
  const tag = (post.tags ?? []).find(
    (entry): entry is Tag => typeof entry === "object" && entry !== null
  );
  const author = (post.authors ?? []).find(
    (entry): entry is Author => typeof entry === "object" && entry !== null
  );
  const avatar = author && typeof author.avatar === "object" ? (author.avatar as Media) : null;
  const image = typeof post.heroImage === "object" && post.heroImage ? post.heroImage : null;

  return {
    author: author
      ? { avatarUrl: avatar?.sizes?.thumbnail?.url ?? avatar?.url ?? null, name: author.name }
      : null,
    date: formatPostDate(post.publishedAt, locale),
    excerpt: post.excerpt,
    href: `${BLOG_CONFIG.basePath}/${post.slug}`,
    image: image ? prepareMediaProps({ aspectRatio: "16/9", image }) : null,
    isoDate: post.publishedAt ?? null,
    readingTime: post.readingTime ?? null,
    tag: tag?.title ?? null,
    title: post.title,
    year: post.publishedAt ? String(new Date(post.publishedAt).getUTCFullYear()) : null,
  };
}

function relationSlug(value: unknown): string | undefined {
  return typeof value === "object" && value !== null && "slug" in value
    ? ((value as { slug?: string | null }).slug ?? undefined)
    : undefined;
}

export async function PostsListBlockComponent({
  eyebrow,
  heading,
  description,
  source,
  tag,
  author,
  limit,
  layout,
  viewAll,
  section,
  id,
}: PostsListBlock) {
  const locale = await resolveLocale();
  const payload = await getPayloadClient();

  const result = await getPosts(payload, {
    author: source === "author" ? relationSlug(author) : undefined,
    tag: source === "tag" ? relationSlug(tag) : undefined,
    limit: limit ?? 3,
    locale,
  });

  const header = prepareSectionHeaderProps({ description, eyebrow, heading });
  const viewAllLink = viewAll ? prepareLinkProps(viewAll, locale) : null;
  const resolvedLayout = (layout ?? "grid") as PostsListLayout;

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      {header && <SectionHeader {...header} className="mb-10" />}
      <PostsList
        items={result.docs.map((post) => toPostsListItem(post as ListedPost, locale))}
        layout={resolvedLayout}
        yearSeparators={resolvedLayout === "list"}
        viewAll={
          viewAllLink?.href ? { href: viewAllLink.href, label: viewAll?.label || "View all" } : null
        }
      />
    </SectionContainer>
  );
}
