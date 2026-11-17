import { draftMode, headers } from "next/headers";

import { getPayloadClient } from "@/dal/payload-client";
import type { Locale } from "@/lib/types";
import type { StandalonePreviewCollection } from "@/lib/utils/standalonePreview";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Config } from "@/payload-types";

import { PAGE_RENDER_DEPTH } from "./getPageBySlug";

/**
 * Reads the latest draft of a header, footer or global block for its standalone preview page.
 *
 * Only an editor gets it: the request must be in draft mode (entered through `/next/preview`,
 * which checks the preview secret and the admin session) and carry a signed-in user, whose
 * access the read goes through. Anyone else gets `null`, so the preview URL is a 404 to them.
 */
export async function getPreviewDocument<TCollection extends StandalonePreviewCollection>({
  collection,
  id,
  locale,
}: {
  collection: TCollection;
  id: number;
  locale?: Locale;
}): Promise<Config["collections"][TCollection] | null> {
  const { isEnabled: draft } = await draftMode();
  if (!draft) return null;

  const payload = await getPayloadClient();
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) return null;

  const doc = await payload.findByID({
    collection,
    context: { visualEditing: true },
    depth: collection === "globalBlock" ? PAGE_RENDER_DEPTH : 2,
    disableErrors: true,
    draft: true,
    id,
    locale: await resolveLocale(locale),
    overrideAccess: false,
    user,
  });

  return doc as Config["collections"][TCollection] | null;
}
