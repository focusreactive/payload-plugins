import type { PayloadRequest } from "payload";

import { I18N_CONFIG } from "@/lib/config/i18n";

export interface PageUsingGlobalBlock {
  id: number;
  title: string;
}

export async function findPagesUsingGlobalBlock({
  id,
  includeDrafts = false,
  req,
}: {
  id: number | string;
  includeDrafts?: boolean;
  req: PayloadRequest;
}): Promise<PageUsingGlobalBlock[]> {
  const pages = new Map<number, PageUsingGlobalBlock>();

  for (const { code: locale } of I18N_CONFIG.locales) {
    for (const draft of includeDrafts ? [false, true] : [false]) {
      const { docs } = await req.payload.find({
        collection: "page",
        depth: 0,
        draft,
        locale,
        overrideAccess: true,
        pagination: false,
        req,
        select: { title: true },
        where: { "blocks.reference": { equals: id } },
      });

      for (const doc of docs) {
        if (!pages.has(doc.id)) {
          pages.set(doc.id, { id: doc.id, title: doc.title });
        }
      }
    }
  }

  return [...pages.values()];
}
