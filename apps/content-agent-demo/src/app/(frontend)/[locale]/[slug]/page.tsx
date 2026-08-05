import config from "@payload-config";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import type { Locale } from "@/lib/locales";
import { LOCALES } from "@/lib/locales";

import { LivePreviewListener } from "../../_components/LivePreviewListener";
import { RenderBlocks } from "../../_components/RenderBlocks";
import { SiteHeader } from "../../_components/SiteHeader";

export default async function SlugPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  if (!LOCALES.includes(locale as Locale)) {
    notFound();
  }

  const { isEnabled: draft } = await draftMode();

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "pages",
    draft,
    overrideAccess: draft,
    where: { slug: { equals: slug } },
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
        {draft ? (
          <LivePreviewListener
            serverURL={process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4042"}
          />
        ) : null}
        <RenderBlocks blocks={page.blocks} />
      </main>
    </>
  );
}
