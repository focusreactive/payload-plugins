import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Header } from "@/collections/Header/Component";
import { getPreviewDocument } from "@/dal";
import type { Locale } from "@/lib/types";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Header Preview",
};

interface Args {
  params: Promise<{
    id: string;
    locale: Locale;
  }>;
}

export default async function HeaderPreviewPage({ params }: Args) {
  const { id, locale } = await params;
  const headerId = Number(id);

  if (!Number.isInteger(headerId)) {
    notFound();
  }

  const header = await getPreviewDocument({ collection: "header", id: headerId, locale });

  if (!header) {
    notFound();
  }

  return (
    <>
      <Header data={header} disableActive />
      {/* Room below the header so dropdown menus open over a page-like canvas. */}
      <main className="min-h-[70vh]" />
    </>
  );
}
