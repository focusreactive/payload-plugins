import type { Endpoint, PayloadRequest } from "payload";
import { getPluginConfig } from "../../config";
import {
  LINK_RESOLVE_BATCH_SIZE,
  LINK_SUGGESTIONS_ENDPOINT_PATH,
  MAX_LINK_RESOLVE_BATCHES,
  MAX_LINK_SUGGESTIONS,
} from "../../constants";
import { originOf, toPath } from "../../links/toPath";
import { docTargetKey } from "../../keyphrases/docTarget";
import { jsonResponse, readJsonBody } from "../http";
import { readAuthorizedRef, rejectNonAdmin } from "../keyphrases/authorize";
import { findLinkSourceRows } from "../keyphrases/rows";
import type { KeyphraseScope, LinkSourceRow } from "../keyphrases/types";
import type { LinkCandidate } from "./findLinkCandidates";
import { findLinkCandidates } from "./findLinkCandidates";
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
  siteOrigins: (string | null)[];
}

function isLinked(suggestion: LinkSuggestion, search: SuggestionSearch): boolean {
  const path = suggestion.url ? toPath(suggestion.url) : null;
  if (!suggestion.url || path === null) return false;

  const internalOrigins = new Set([...search.siteOrigins, originOf(suggestion.url)]);

  return search.linkedHrefs.some(
    (href) => href.path === path && (href.origin === null || internalOrigins.has(href.origin))
  );
}

function siteOriginsOf(req: PayloadRequest): (string | null)[] {
  const siteUrl = getPluginConfig().site?.baseUrl ?? "";

  return [originOf(req.payload.config.serverURL ?? ""), originOf(siteUrl)];
}

async function collectSuggestions(
  search: SuggestionSearch,
  batch = 0,
  found: LinkSuggestion[] = []
): Promise<LinkSuggestion[]> {
  const start = batch * LINK_RESOLVE_BATCH_SIZE;
  const slice = search.candidates.slice(start, start + LINK_RESOLVE_BATCH_SIZE);
  const done = found.length >= MAX_LINK_SUGGESTIONS || batch >= MAX_LINK_RESOLVE_BATCHES;
  if (done || slice.length === 0) return found.slice(0, MAX_LINK_SUGGESTIONS);

  const resolved = await resolveLinkTargets(search.req, slice, search.locale);
  const unlinked = resolved.filter((suggestion) => !isLinked(suggestion, search));

  return collectSuggestions(search, batch + 1, [...found, ...unlinked]);
}

function unlinkedCandidates(request: LinkRequest, rows: LinkSourceRow[]): LinkCandidate[] {
  return findLinkCandidates(request.text, toLinkSources(rows)).filter(
    (candidate) => !request.linkedDocs.has(docTargetKey(candidate.collection, candidate.docId))
  );
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
      if (!request) return jsonResponse({ error: "Invalid request" }, 400);

      const ref = await readAuthorizedRef(req, body, scope);
      if (ref instanceof Response) return ref;

      const rows = await findLinkSourceRows(req, ref, scope.collections);
      const suggestions = await collectSuggestions({
        req,
        candidates: unlinkedCandidates(request, rows),
        locale: ref.locale,
        linkedHrefs: request.linkedHrefs,
        siteOrigins: siteOriginsOf(req),
      });

      return jsonResponse({ suggestions }, 200);
    },
  };
}
