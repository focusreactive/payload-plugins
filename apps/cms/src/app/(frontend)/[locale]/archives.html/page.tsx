import type { Metadata } from "next";

import { getAllPosts } from "@/dal";
import type { Locale } from "@/lib/types";
import type { Post } from "@/payload-types";

import { ArticleIndex } from "../_components/ArticleIndex";

interface Props {
  params: Promise<{ locale: Locale }>;
}

/** Old full archive: every article on one page, grouped by year. */
export default async function ArchivesPage({ params }: Props) {
  const { locale } = await params;
  const posts = await getAllPosts({ locale });

  return <ArticleIndex locale={locale} title="Articles" posts={posts as Post[]} yearSeparators />;
}

export const metadata: Metadata = {
  alternates: { canonical: "/archives.html" },
  title: "Articles",
};
