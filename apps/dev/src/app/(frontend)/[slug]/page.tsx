import { TrackPage } from "@focus-reactive/payload-plugin-analytics/client";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import React from "react";

import config from "@/payload.config";

import { LocaleSwitcher } from "./LocaleSwitcher";
import { isLocale } from "./locales";
import { PageClient } from "./PageClient";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string }>;
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const { locale: requested } = await searchParams;
  const locale = isLocale(requested) ? requested : "en";
  const payload = await getPayload({ config });

  const { docs } = await payload.find({
    collection: "pages",
    depth: 1,
    limit: 1,
    locale,
    where: {
      and: [{ slug: { equals: slug } }, { _status: { equals: "published" } }],
    },
  });

  const page = docs[0];
  if (!page) {
    notFound();
  }

  return (
    <>
      <LocaleSwitcher current={locale} />
      <TrackPage collection="pages" id={page.id} locale={locale} />
      {/* Keyed by locale: `useLivePreview` snapshots `initialData` on mount, so without a remount
          the previous locale's content would survive the switch. */}
      <PageClient
        key={locale}
        initialData={page as any}
        serverURL={process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4040"}
      />
    </>
  );
}
