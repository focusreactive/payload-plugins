import type { CollectionAfterChangeHook, PayloadRequest } from "payload";

import { I18N_CONFIG } from "@/lib/config/i18n";
import { revalidatePageCache } from "@/lib/utils/revalidatePageCache";
import type { GlobalBlock } from "@/payload-types";

import { findPagesUsingGlobalBlock } from "../findPagesUsingGlobalBlock";
import { isPublishedGlobalBlock } from "../slots";

async function changesPublishedContent({
  doc,
  previousDoc,
  req,
}: {
  doc: GlobalBlock;
  previousDoc?: GlobalBlock;
  req: PayloadRequest;
}): Promise<boolean> {
  if (isPublishedGlobalBlock(doc)) return true;
  if (!isPublishedGlobalBlock(previousDoc)) return false;

  const live = await req.payload.findByID({
    collection: "globalBlock",
    depth: 0,
    id: doc.id,
    overrideAccess: true,
    req,
    select: { _status: true },
  });

  return !isPublishedGlobalBlock(live);
}

export const revalidatePagesUsingGlobalBlock: CollectionAfterChangeHook<GlobalBlock> = async ({
  doc,
  previousDoc,
  req,
}) => {
  const { context, payload } = req;

  if (context.disableRevalidate || !(await changesPublishedContent({ doc, previousDoc, req }))) {
    return doc;
  }

  const pageIds = (await findPagesUsingGlobalBlock({ id: doc.id, req })).map((p) => p.id);
  if (pageIds.length === 0) {
    return doc;
  }

  for (const { code: locale } of I18N_CONFIG.locales) {
    const { docs: publishedPages } = await payload.find({
      collection: "page",
      depth: 0,
      locale,
      overrideAccess: true,
      pagination: false,
      req,
      select: { breadcrumbs: true, slug: true },
      where: { _status: { equals: "published" }, id: { in: pageIds } },
    });

    for (const page of publishedPages) {
      revalidatePageCache({ doc: page, locale, payload });
    }
  }

  return doc;
};
