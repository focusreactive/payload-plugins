import type { PayloadRequest } from "payload";
import { getPluginConfig } from "../../config";
import { PLUGIN_NAME } from "../../constants";
import { docTargetKey } from "../../keyphrases/docTarget";
import type { LinkMatch, LinkSuggestion } from "../../links/types";
import type { ResolveUrl } from "../../types/config";
import { findReadableDocs } from "../docTargets";
import type { ReadableDoc } from "../docTargets";
import type { LinkCandidate } from "./findLinkCandidates";

type LinkTarget = Omit<LinkSuggestion, keyof LinkMatch>;

function resolveUrlFor(collection: string): ResolveUrl | undefined {
  return getPluginConfig().collections.find((c) => c.slug === collection)?.resolveUrl;
}

async function safeResolveUrl(
  req: PayloadRequest,
  { summary, doc }: ReadableDoc,
  locale: string
): Promise<string | null> {
  const resolveUrl = resolveUrlFor(summary.collection);
  if (!resolveUrl) return null;

  try {
    const url = await resolveUrl({ doc, locale, req });

    return typeof url === "string" ? url : null;
  } catch (err) {
    req.payload.logger.warn({ err }, `[${PLUGIN_NAME}] resolveUrl failed`);
    return null;
  }
}

async function toLinkTarget(
  req: PayloadRequest,
  found: ReadableDoc,
  locale: string
): Promise<LinkTarget> {
  return { ...found.summary, url: await safeResolveUrl(req, found, locale) };
}

export async function resolveLinkTargets(
  req: PayloadRequest,
  candidates: LinkCandidate[],
  locale: string
): Promise<LinkSuggestion[]> {
  const found = await findReadableDocs(req, candidates, { locale, publishedOnly: true });
  const loaded = await Promise.all(found.map((doc) => toLinkTarget(req, doc, locale)));
  const targets = new Map(loaded.map((t) => [docTargetKey(t.collection, t.id), t]));

  return candidates.flatMap(({ docId, ...candidate }) => {
    const target = targets.get(docTargetKey(candidate.collection, docId));

    return target ? [{ ...candidate, ...target }] : [];
  });
}
