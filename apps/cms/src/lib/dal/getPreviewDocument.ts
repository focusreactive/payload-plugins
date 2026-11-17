import { draftMode } from "next/headers";

import { getPayloadClient } from "@/dal/payload-client";
import type { Locale } from "@/lib/types";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Footer, Header } from "@/payload-types";

interface PreviewDocuments {
  footer: Footer;
  header: Header;
}

/**
 * Reads a header/footer for its standalone preview page. In draft mode (entered through
 * `/next/preview`, which requires an admin session) the latest draft is returned;
 * otherwise only a published document is.
 */
export async function getPreviewDocument<TCollection extends keyof PreviewDocuments>({
  collection,
  id,
  locale,
}: {
  collection: TCollection;
  id: number;
  locale?: Locale;
}): Promise<PreviewDocuments[TCollection] | null> {
  const { isEnabled: draft } = await draftMode();
  const payload = await getPayloadClient();

  const doc = (await payload.findByID({
    collection,
    depth: 2,
    disableErrors: true,
    draft,
    id,
    locale: await resolveLocale(locale),
  })) as PreviewDocuments[TCollection] | null;

  if (!doc) return null;
  if (!draft && doc._status !== "published") return null;

  return doc;
}
