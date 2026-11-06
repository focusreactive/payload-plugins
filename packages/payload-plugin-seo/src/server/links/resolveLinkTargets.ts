import type { PayloadRequest, Where } from "payload";
import { getPluginConfig } from "../../config";
import { PLUGIN_NAME } from "../../constants";
import { docTargetKey } from "../../keyphrases/docTarget";
import type { LinkMatch, LinkSuggestion } from "../../links/types";
import type { ResolveUrl } from "../../types/config";
import { groupByCollection, titleFieldOf, toUsageDoc } from "../docTargets";
import type { FoundDoc } from "../findDocsByIds";
import { findDocsByIds } from "../findDocsByIds";
import type { LinkCandidate } from "./findLinkCandidates";

type LinkTarget = Omit<LinkSuggestion, keyof LinkMatch>;

function resolveUrlFor(collection: string): ResolveUrl | undefined {
  return getPluginConfig().collections.find((c) => c.slug === collection)?.resolveUrl;
}

const PUBLISHED_ONLY: Where = { _status: { equals: "published" } };

function publishedFilter(req: PayloadRequest, collection: string): Where | undefined {
  return req.payload.collections[collection]?.config.versions?.drafts ? PUBLISHED_ONLY : undefined;
}

async function safeResolveUrl(
  req: PayloadRequest,
  resolveUrl: ResolveUrl | undefined,
  doc: FoundDoc,
  locale: string
): Promise<string | null> {
  if (!resolveUrl) return null;

  try {
    const url = await resolveUrl({ doc, locale, req });

    return typeof url === "string" ? url : null;
  } catch (err) {
    req.payload.logger.warn({ err }, `[${PLUGIN_NAME}] resolveUrl failed`);
    return null;
  }
}

async function loadTargets(
  req: PayloadRequest,
  collection: string,
  ids: string[],
  locale: string
): Promise<LinkTarget[]> {
  const titleField = titleFieldOf(req, collection);
  const resolveUrl = resolveUrlFor(collection);

  const docs = await findDocsByIds(req.payload, {
    collection,
    ids,
    overrideAccess: false,
    locale,
    req,
    where: publishedFilter(req, collection),
  });

  return Promise.all(
    docs.map(async (doc) => ({
      ...toUsageDoc(collection, doc, titleField),
      url: await safeResolveUrl(req, resolveUrl, doc, locale),
    }))
  );
}

export async function resolveLinkTargets(
  req: PayloadRequest,
  candidates: LinkCandidate[],
  locale: string
): Promise<LinkSuggestion[]> {
  const groups = [...groupByCollection(candidates)];
  const loaded = await Promise.all(
    groups.map(([collection, ids]) => loadTargets(req, collection, ids, locale))
  );
  const targets = new Map(loaded.flat().map((t) => [docTargetKey(t.collection, t.id), t]));

  return candidates.flatMap(({ docId, ...candidate }) => {
    const target = targets.get(docTargetKey(candidate.collection, docId));

    return target ? [{ ...candidate, ...target }] : [];
  });
}
