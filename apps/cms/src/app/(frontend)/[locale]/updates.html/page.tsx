import type { Metadata } from "next";

import { getPayloadClient, getPosts } from "@/dal";
import type { Locale } from "@/lib/types";
import type { Post } from "@/payload-types";

import { ArticleIndex } from "../_components/ArticleIndex";

const PATH = "/updates.html";

interface Props {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ page?: string }>;
}

/** Old blog index: newest articles first, paginated. */
export default async function UpdatesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const result = await getPosts(await getPayloadClient(), { locale, page });

  return (
    <ArticleIndex
      locale={locale}
      title="Blog"
      posts={result.docs as Post[]}
      pagination={{ basePath: PATH, page, totalPages: result.totalPages }}
    />
  );
}

export const metadata: Metadata = {
  alternates: { canonical: PATH },
  title: "Blog",
};
