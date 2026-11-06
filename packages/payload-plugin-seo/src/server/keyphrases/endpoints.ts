import type { Endpoint } from "payload";
import {
  KEYPHRASES_COLLECTION_SLUG,
  KEYPHRASES_ENDPOINT_PATH,
  KEYPHRASE_USAGE_ENDPOINT_PATH,
} from "../../constants";
import { canonicalIntent } from "../../keyphrases/canonicalIntent";
import type { StoredKeyphrase } from "../../keyphrases/stored";
import { sanitizeStoredKeyphrases } from "../../keyphrases/stored";
import { jsonResponse, readJsonBody } from "../http";
import { canUpdateDoc, readAuthorizedRef } from "./authorize";
import { resolveTitles } from "./resolveTitles";
import { findRow, findRowsSharingIntent } from "./rows";
import type { KeyphraseScope } from "./types";

function intentsOf(keyphrases: StoredKeyphrase[]): string[] {
  return [...new Set(keyphrases.map((k) => canonicalIntent(k.text)).filter(Boolean))];
}

export function createKeyphraseEndpoints(scope: KeyphraseScope): Endpoint[] {
  const getKeyphrases: Endpoint = {
    path: KEYPHRASES_ENDPOINT_PATH,
    method: "get",
    handler: async (req) => {
      const ref = await readAuthorizedRef(req, req.query, scope);
      if (ref instanceof Response) return ref;

      const [row, canUpdate] = await Promise.all([findRow(req, ref), canUpdateDoc(req, ref)]);

      return jsonResponse(
        { keyphrases: sanitizeStoredKeyphrases(row?.keyphrases), indexed: Boolean(row), canUpdate },
        200
      );
    },
  };

  const putKeyphrases: Endpoint = {
    path: KEYPHRASES_ENDPOINT_PATH,
    method: "put",
    handler: async (req) => {
      const body = await readJsonBody(req);
      const ref = await readAuthorizedRef(req, body, scope, "update");
      if (ref instanceof Response) return ref;
      if (!Array.isArray(body.keyphrases)) {
        return jsonResponse({ error: "Invalid request" }, 400);
      }

      const keyphrases = sanitizeStoredKeyphrases(body.keyphrases);
      const row = await findRow(req, ref);

      if (row && body.ifAbsent === true) {
        return jsonResponse({ keyphrases: sanitizeStoredKeyphrases(row.keyphrases) }, 409);
      }
      if (keyphrases.length === 0 && !row) return jsonResponse({ keyphrases }, 200);

      const intents = intentsOf(keyphrases);

      if (row) {
        await req.payload.update({
          collection: KEYPHRASES_COLLECTION_SLUG,
          id: row.id,
          data: { keyphrases, intents },
          overrideAccess: true,
          req,
        });
      } else {
        await req.payload.create({
          collection: KEYPHRASES_COLLECTION_SLUG,
          data: {
            docCollection: ref.collection,
            docId: ref.docId,
            locale: ref.locale,
            keyphrases,
            intents,
          },
          overrideAccess: true,
          req,
        });
      }

      return jsonResponse({ keyphrases }, 200);
    },
  };

  const getUsage: Endpoint = {
    path: KEYPHRASE_USAGE_ENDPOINT_PATH,
    method: "get",
    handler: async (req) => {
      const ref = await readAuthorizedRef(req, req.query, scope);
      if (ref instanceof Response) return ref;

      const { phrase } = req.query;
      const intent = typeof phrase === "string" ? canonicalIntent(phrase) : "";
      if (!intent) return jsonResponse({ docs: [] }, 200);

      const rows = await findRowsSharingIntent(req, ref, intent, scope.collections);
      const targets = rows.map((row) => ({ collection: row.docCollection, docId: row.docId }));
      const docs = await resolveTitles(req, targets, ref.locale);

      return jsonResponse({ docs }, 200);
    },
  };

  return [getKeyphrases, putKeyphrases, getUsage];
}
