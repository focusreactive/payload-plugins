import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteGlobalSectionContent } from "@/blocks/GlobalSectionSlot/SiteGlobalSection";
import { SitePage } from "@/components/site/layout/SitePage";
import { getPreviewDocument } from "@/dal";
import { getSiteChrome } from "@/dal/entities";
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

const SpaceForDropdownMenus = () => <div style={{ minHeight: "70vh" }} />;

export default async function StandalonePreviewPage({ params }: Args) {
  const { collection: segment, id, locale } = await params;
  const docId = Number(id);

  if (!isStandalonePreviewSegment(segment) || !Number.isInteger(docId)) {
    notFound();
  }

  const read = { id: docId, locale };

  switch (STANDALONE_PREVIEW_COLLECTIONS[segment]) {
    case "header":
    case "footer": {
      const collection = STANDALONE_PREVIEW_COLLECTIONS[segment] as "header" | "footer";
      const [doc, chrome] = await Promise.all([
        getPreviewDocument({ ...read, collection }),
        getSiteChrome(locale),
      ]);
      if (!doc) notFound();

      // The site's own chrome around an empty page, with the edited draft in place of its own kind.
      return (
        <SitePage
          bodyId="chrome-preview"
          footer={collection === "footer" ? doc : chrome.footer}
          header={collection === "header" ? doc : chrome.header}
          locale={locale}
          path="/"
          template="default"
        >
          <SpaceForDropdownMenus />
        </SitePage>
      );
    }
    case "globalBlock": {
      const [globalBlock, chrome] = await Promise.all([
        getPreviewDocument({ ...read, collection: "globalBlock" }),
        getSiteChrome(locale),
      ]);
      if (!globalBlock) notFound();

      return (
        <SitePage
          bodyId="global-section-preview"
          footer={chrome.footer}
          header={chrome.header}
          locale={locale}
          path="/"
          template="default"
        >
          <SiteGlobalSectionContent globalBlock={globalBlock} locale={locale} />
        </SitePage>
      );
    }
  }
}
