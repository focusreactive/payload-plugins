import type { Where } from "payload";
import { COMMENT_READS_COLLECTION_SLUG, DEFAULT_COLLECTION_SLUG } from "../constants";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import { getCurrentTenantId } from "./getCurrentTenantId";
import type { CommentsPluginConfigStorage, Mode, Response, ServiceContext } from "../types";

export interface CountUnreadMentionsArgs {
  enabledCollections?: string[];
  enabledGlobals?: string[];
  mode: Mode;
  collectionSlug: string | null | undefined;
  documentId: number | null | undefined;
  globalSlug: string | null;
  locale: string | null | undefined;
}

interface WhereWithRequiredAnd extends Where {
  and: Where[];
}

export async function countUnreadMentions(
  { payload, user, headers }: ServiceContext,
  {
    enabledCollections,
    enabledGlobals,
    mode,
    collectionSlug,
    documentId,
    globalSlug,
    locale,
  }: CountUnreadMentionsArgs
): Promise<Response<{ count: number }>> {
  try {
    const pluginConfig = payload.config.admin?.custom?.commentsPlugin as
      | CommentsPluginConfigStorage
      | undefined;
    const collections = enabledCollections ?? pluginConfig?.collections ?? [];
    const globals = enabledGlobals ?? pluginConfig?.globals ?? [];

    const tenantId = getCurrentTenantId(payload, headers);

    const where: WhereWithRequiredAnd = {
      and: [
        { "mentions.user": { equals: user.id } },
        { author: { not_equals: user.id } },
        { isResolved: { equals: false } },
      ],
    };

    if (mode === "document" && collectionSlug && documentId) {
      where.and.push(
        {
          collectionSlug: { equals: collectionSlug },
        },
        {
          documentId: { equals: documentId },
        }
      );
    } else if (mode === "global-document" && globalSlug) {
      where.and.push({ globalSlug: { equals: globalSlug } });
    } else {
      const hasCollections = collections.length > 0;
      const hasGlobals = globals.length > 0;

      if (hasCollections || hasGlobals) {
        where.and.push({
          or: [
            ...(hasCollections ? [{ collectionSlug: { in: collections } }] : []),
            ...(hasGlobals ? [{ globalSlug: { in: globals } }] : []),
          ],
        });
      }
    }

    if (locale) {
      where.and.push({
        or: [{ locale: { equals: locale } }, { locale: { exists: false } }],
      });
    }

    if (tenantId) {
      where.and.push({ tenant: { equals: tenantId } });
    }

    const { docs: candidates } = await payload.find({
      collection: DEFAULT_COLLECTION_SLUG,
      where,
      limit: 200,
      depth: 0,
      overrideAccess: true,
      select: { id: true },
    });

    if (candidates.length === 0) {
      return {
        success: true,
        data: { count: 0 },
      };
    }

    const candidateIds = candidates.map((c) => c.id as number);

    const { docs: reads } = await payload.find({
      collection: COMMENT_READS_COLLECTION_SLUG,
      where: {
        and: [{ user: { equals: user.id } }, { comment: { in: candidateIds } }],
      },
      limit: candidateIds.length,
      depth: 0,
      overrideAccess: true,
      select: { comment: true },
    });

    const readSet = new Set<number>();
    for (const r of reads as Array<{ comment: number | { id: number } }>) {
      const id = typeof r.comment === "object" ? r.comment.id : r.comment;

      if (typeof id === "number") readSet.add(id);
    }

    const count = candidateIds.reduce((acc, id) => (readSet.has(id) ? acc : acc + 1), 0);

    return {
      success: true,
      data: { count },
    };
  } catch (err) {
    console.error("countUnreadMentions failed:", err);

    return {
      success: false,
      error: getDefaultErrorMessage(err),
    };
  }
}
