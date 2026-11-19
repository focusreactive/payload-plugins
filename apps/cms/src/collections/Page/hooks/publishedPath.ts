import type { CollectionBeforeChangeHook, PayloadRequest } from "payload";

import { getPathFromBreadcrumbs } from "@/lib/utils/path/getPathFromBreadcrumbs";
import type { Page } from "@/payload-types";

const PUBLISHED_PATHS_BEFORE_CHANGE = "publishedPathsBeforeChange";

type PublishedPaths = Record<string, string | undefined>;

export async function readPublishedPath(
  req: PayloadRequest,
  id: number
): Promise<string | undefined> {
  const published = await req.payload.findByID({
    collection: "page",
    depth: 0,
    disableErrors: true,
    draft: false,
    id,
    locale: req.locale ?? undefined,
    overrideAccess: true,
    req,
    select: { _status: true, breadcrumbs: true },
  });

  return published?._status === "published"
    ? (getPathFromBreadcrumbs(published.breadcrumbs) ?? "home")
    : undefined;
}

// Payload passes the latest autosaved draft as `previousDoc`, so the published path is read before it is overwritten.
export const rememberPublishedPath: CollectionBeforeChangeHook<Page> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== "update" || data._status !== "published" || !originalDoc?.id) return data;

  const publishedPaths = (req.context[PUBLISHED_PATHS_BEFORE_CHANGE] ??= {}) as PublishedPaths;
  publishedPaths[originalDoc.id] = await readPublishedPath(req, originalDoc.id);

  return data;
};

export const publishedPathBeforeChange = (req: PayloadRequest, id: number): string | undefined =>
  (req.context[PUBLISHED_PATHS_BEFORE_CHANGE] as PublishedPaths | undefined)?.[id];
