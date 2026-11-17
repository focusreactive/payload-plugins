import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/collections/Footer/Component";
import { getPreviewDocument } from "@/dal";
import type { Locale } from "@/lib/types";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Footer Preview",
};

interface Args {
  params: Promise<{
    id: string;
    locale: Locale;
  }>;
}

export default async function FooterPreviewPage({ params }: Args) {
  const { id, locale } = await params;
  const footerId = Number(id);

  if (!Number.isInteger(footerId)) {
    notFound();
  }

  const footer = await getPreviewDocument({ collection: "footer", id: footerId, locale });

  if (!footer) {
    notFound();
  }

  return <Footer data={footer} />;
}
