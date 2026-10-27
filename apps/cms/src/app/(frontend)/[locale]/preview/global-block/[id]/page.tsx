import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GlobalBlockRenderer } from "@/blocks/GlobalSectionSlot/GlobalBlockRenderer";
import type { Locale } from "@/lib/types";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Global Block Preview",
};

interface Args {
  params: Promise<{
    id: string;
    locale: Locale;
  }>;
}

export default async function GlobalBlockPreviewPage({ params }: Args) {
  const { id, locale } = await params;
  const referenceId = Number(id);

  if (!Number.isInteger(referenceId)) {
    notFound();
  }

  return (
    <main>
      <GlobalBlockRenderer locale={locale} referenceId={referenceId} />
    </main>
  );
}
