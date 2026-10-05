"use client";

import { useTranslations } from "next-intl";

import { blogHref } from "@/app/(frontend)/[locale]/blog/_components/BlogPageContent/utils/blogHref";
import { BLOG_CONFIG } from "@/lib/config/blog";

import { cn } from "../utils";
import { FilterChip } from "./FilterChip";

interface FilterChipsProps {
  tags: { title: string; slug: string }[];
  query?: string;
}

/** "All" stays on the blog; every tag opens its own page (/tag/<slug>), as on the old site. */
export function FilterChips({ tags, query }: FilterChipsProps) {
  const t = useTranslations("blog.search");

  return (
    <div className={cn("flex flex-wrap items-center sm:justify-center gap-2.5")}>
      <FilterChip href={blogHref({ q: query })} isActive label={t("all")} />
      {tags.map((tag) => (
        <FilterChip
          href={`${BLOG_CONFIG.tagBasePath}/${tag.slug}`}
          isActive={false}
          key={tag.slug}
          label={tag.title}
        />
      ))}
    </div>
  );
}
