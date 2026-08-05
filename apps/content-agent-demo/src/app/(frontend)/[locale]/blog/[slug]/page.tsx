import config from "@payload-config";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import type { Locale } from "@/lib/locales";
import { LOCALES } from "@/lib/locales";

import { RichText } from "../../../_components/RichText";
import { SiteHeader } from "../../../_components/SiteHeader";

export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  if (!LOCALES.includes(locale as Locale)) {
    notFound();
  }

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "posts",
    where: { slug: { equals: slug } },
    locale: locale as Locale,
    depth: 1,
    limit: 1,
  });

  const post = result.docs[0];
  if (!post) {
    notFound();
  }

  return (
    <>
      <SiteHeader locale={locale as Locale} />
      <main className="wrap">
        <h1>{post.title}</h1>
        <p className="muted">{post.excerpt}</p>
        <RichText data={post.content} />
      </main>
    </>
  );
}
