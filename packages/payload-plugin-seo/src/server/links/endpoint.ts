import type { Endpoint, PayloadRequest } from "payload";
import { getPluginConfig } from "../../config";
import {
  LINK_RESOLVE_BATCH_SIZE,
  LINK_SUGGESTIONS_ENDPOINT_PATH,
  MAX_LINK_SUGGESTIONS,
  MAX_RESOLVED_LINK_CANDIDATES,
} from "../../constants";
import { siteOf, toPath } from "../../links/toPath";
import { docTargetKey } from "../../keyphrases/docTarget";
import { readJsonBody } from "../http";
import { readAuthorizedRef, rejectNonAdmin } from "../keyphrases/authorize";
import { findLinkSourcePages } from "../keyphrases/rows";
import type { DocRef, KeyphraseScope, LinkSourceRow } from "../keyphrases/types";
import type { LinkCandidate } from "./findLinkCandidates";
import { byRelevance, findLinkCandidates } from "./findLinkCandidates";
import type { LinkRequest, LinkedHref } from "./request";
import { readLinkRequest } from "./request";
import type { LinkSuggestion } from "../../links/types";
import { resolveLinkTargets } from "./resolveLinkTargets";
import { toLinkSources } from "./toLinkSources";

interface SuggestionSearch {
  req: PayloadRequest;
  candidates: LinkCandidate[];
  locale: string;
  linkedHrefs: LinkedHref[];
  sites: (string | null)[];
}

function isLinked(suggestion: LinkSuggestion, search: SuggestionSearch): boolean {
  const path = suggestion.url ? toPath(suggestion.url) : null;
  if (!suggestion.url || path === null) return false;

  const internalSites = new Set([...search.sites, siteOf(suggestion.url)]);

  return search.linkedHrefs.some(
    (href) => href.path === path && (href.site === null || internalSites.has(href.site))
  );
}

function internalSitesOf(req: PayloadRequest): (string | null)[] {
  const siteUrl = getPluginConfig().site?.baseUrl ?? "";

  return [siteOf(req.payload.config.serverURL ?? ""), siteOf(siteUrl), siteOf(req.origin ?? "")];
}

async function collectSuggestions(search: SuggestionSearch): Promise<LinkSuggestion[]> {
  const candidates = search.candidates.slice(0, MAX_RESOLVED_LINK_CANDIDATES);
  const found: LinkSuggestion[] = [];
  let start = 0;
  let batchSize = LINK_RESOLVE_BATCH_SIZE;

  while (start < candidates.length && found.length < MAX_LINK_SUGGESTIONS) {
    const batch = candidates.slice(start, start + batchSize);
    const resolved = await resolveLinkTargets(search.req, batch, search.locale);

    found.push(...resolved.filter((suggestion) => !isLinked(suggestion, search)));
    start += batchSize;
    batchSize *= 2;
  }

  return found.slice(0, MAX_LINK_SUGGESTIONS);
}

function unlinkedCandidates(request: LinkRequest, rows: LinkSourceRow[]): LinkCandidate[] {
  return findLinkCandidates(request.text, toLinkSources(rows)).filter(
    (candidate) => !request.linkedDocs.has(docTargetKey(candidate.collection, candidate.docId))
  );
}

async function findUnlinkedCandidates(
  req: PayloadRequest,
  ref: DocRef,
  collections: string[],
  request: LinkRequest
): Promise<LinkCandidate[]> {
  const candidates: LinkCandidate[] = [];

  for await (const rows of findLinkSourcePages(req, ref, collections)) {
    candidates.push(...unlinkedCandidates(request, rows));
  }

  return candidates.sort(byRelevance);
}

export function createLinkSuggestionsEndpoint(scope: KeyphraseScope): Endpoint {
  return {
    path: LINK_SUGGESTIONS_ENDPOINT_PATH,
    method: "post",
    handler: async (req) => {
      const rejected = rejectNonAdmin(req);
      if (rejected) return rejected;

      const body = await readJsonBody(req);
      const request = readLinkRequest(body, scope.collections);
      if (!request) return Response.json({ error: "Invalid request" }, { status: 400 });

      const ref = await readAuthorizedRef(req, body, scope);
      if (ref instanceof Response) return ref;

      const suggestions = await collectSuggestions({
        req,
        candidates: await findUnlinkedCandidates(req, ref, scope.collections, request),
        locale: ref.locale,
        linkedHrefs: request.linkedHrefs,
        sites: internalSitesOf(req),
      });

      return Response.json({ suggestions });
    },
  };
}
