import config from "@payload-config";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import type { Locale } from "@/lib/locales";
import { LOCALES } from "@/lib/locales";

import { RenderBlocks } from "../_components/RenderBlocks";
import { SiteHeader } from "../_components/SiteHeader";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!LOCALES.includes(locale as Locale)) {
    notFound();
  }

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "pages",
    where: { slug: { equals: "home" } },
    locale: locale as Locale,
    limit: 1,
  });

  const page = result.docs[0];
  if (!page) {
    notFound();
  }

  return (
    <>
      <SiteHeader locale={locale as Locale} />
      <main className="wrap">
        <RenderBlocks blocks={page.blocks} />
      </main>
    </>
  );
}
