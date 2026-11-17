import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GlobalBlockContent } from "@/blocks/GlobalSectionSlot/GlobalBlockRenderer";
import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";
import { getPreviewDocument } from "@/dal";
import type { Locale } from "@/lib/types";
import {
  STANDALONE_PREVIEW_COLLECTIONS,
  isStandalonePreviewSegment,
} from "@/lib/utils/standalonePreview";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Preview",
};

interface Args {
  params: Promise<{
    collection: string;
    id: string;
    locale: Locale;
  }>;
}

/**
 * Preview of a document that has no URL of its own: a header, a footer or a global block.
 * Only editors in draft mode get a document; everyone else gets a 404, see `getPreviewDocument`.
 */
export default async function StandalonePreviewPage({ params }: Args) {
  const { collection: segment, id, locale } = await params;
  const docId = Number(id);

  if (!isStandalonePreviewSegment(segment) || !Number.isInteger(docId)) {
    notFound();
  }

  const read = { id: docId, locale };

  switch (STANDALONE_PREVIEW_COLLECTIONS[segment]) {
    case "header": {
      const header = await getPreviewDocument({ ...read, collection: "header" });
      if (!header) notFound();

      return (
        <>
          <Header data={header} disableActive editable />
          {/* Room below the header so its dropdown menus open over a page-like canvas. */}
          <main className="min-h-[70vh]" />
        </>
      );
    }
    case "footer": {
      const footer = await getPreviewDocument({ ...read, collection: "footer" });
      if (!footer) notFound();

      return <Footer data={footer} editable />;
    }
    case "globalBlock": {
      const globalBlock = await getPreviewDocument({ ...read, collection: "globalBlock" });
      if (!globalBlock) notFound();

      return (
        <main>
          <GlobalBlockContent globalBlock={globalBlock} />
        </main>
      );
    }
  }
}
