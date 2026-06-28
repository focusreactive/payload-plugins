"use client";

import { useTranslations } from "next-intl";
import { cn } from "../utils";
import { FilterChip } from "./FilterChip";
import { blogHref } from "@/app/(frontend)/[locale]/blog/_components/BlogPageContent/utils/blogHref";

interface FilterChipsProps {
  categories: { title: string; slug: string }[];
  activeCategory?: string;
  query?: string;
}

export function FilterChips({ categories, activeCategory, query }: FilterChipsProps) {
  const t = useTranslations("blog.search");

  return (
    <div className={cn("flex flex-wrap items-center sm:justify-center gap-2.5")}>
      <FilterChip href={blogHref({ q: query })} isActive={!activeCategory} label={t("all")} />
      {categories.map((category) => (
        <FilterChip
          href={blogHref({ category: category.slug, q: query })}
          isActive={activeCategory === category.slug}
          key={category.slug}
          label={category.title}
        />
      ))}
    </div>
  );
}
