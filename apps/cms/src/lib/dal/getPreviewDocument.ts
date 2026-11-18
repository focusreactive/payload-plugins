import { draftMode, headers } from "next/headers";

import { getPayloadClient } from "@/dal/payload-client";
import type { Locale } from "@/lib/types";
import type { StandalonePreviewCollection } from "@/lib/utils/standalonePreview";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Config } from "@/payload-types";

import { PAGE_RENDER_DEPTH } from "./getPageBySlug";

const PREVIEW_DEPTH: Record<StandalonePreviewCollection, number> = {
  footer: 1,
  globalBlock: PAGE_RENDER_DEPTH,
  header: 1,
};

const LINKED_PAGE_FIELDS = { breadcrumbs: true, slug: true } as const;

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
    depth: PREVIEW_DEPTH[collection],
    disableErrors: true,
    draft: true,
    id,
    locale: await resolveLocale(locale),
    overrideAccess: false,
    populate: { page: LINKED_PAGE_FIELDS },
    user,
  });

  return doc as Config["collections"][TCollection] | null;
}
