import type { Endpoint, PayloadRequest } from "payload";
import {
  KEYPHRASES_COLLECTION_SLUG,
  KEYPHRASES_ENDPOINT_PATH,
  KEYPHRASE_USAGE_ENDPOINT_PATH,
} from "../../constants";
import { canonicalIntent } from "../../keyphrases/text";
import type { StoredKeyphrase } from "../../keyphrases/stored";
import { sanitizeStoredKeyphrases } from "../../keyphrases/stored";
import { findReadableDocs } from "../docTargets";
import { readJsonBody } from "../http";
import { canUpdateDoc, readAuthorizedRef } from "./authorize";
import { findRow, findRowsSharingIntent } from "./rows";
import type { DocRef, KeyphraseRow, KeyphraseScope } from "./types";

function intentsOf(keyphrases: StoredKeyphrase[]): string[] {
  return [...new Set(keyphrases.map((k) => canonicalIntent(k.text)).filter(Boolean))];
}

interface KeyphraseWrite {
  keyphrases: StoredKeyphrase[];
  ifAbsent: boolean;
}

async function writeToExistingRow(
  req: PayloadRequest,
  row: KeyphraseRow,
  { keyphrases, ifAbsent }: KeyphraseWrite
): Promise<Response> {
  if (ifAbsent) {
    return Response.json({ keyphrases: sanitizeStoredKeyphrases(row.keyphrases) }, { status: 409 });
  }

  await req.payload.update({
    collection: KEYPHRASES_COLLECTION_SLUG,
    id: row.id,
    data: { keyphrases, intents: intentsOf(keyphrases) },
    overrideAccess: true,
    req,
  });

  return Response.json({ keyphrases });
}

async function createRow(
  req: PayloadRequest,
  ref: DocRef,
  write: KeyphraseWrite
): Promise<Response> {
  try {
    await req.payload.create({
      collection: KEYPHRASES_COLLECTION_SLUG,
      data: {
        docCollection: ref.collection,
        docId: ref.docId,
        locale: ref.locale,
        keyphrases: write.keyphrases,
        intents: intentsOf(write.keyphrases),
      },
      overrideAccess: true,
      req,
    });
  } catch (err) {
    const createdMeanwhile = await findRow(req, ref);
    if (!createdMeanwhile) throw err;

    return writeToExistingRow(req, createdMeanwhile, write);
  }

  return Response.json({ keyphrases: write.keyphrases });
}

export function createKeyphraseEndpoints(scope: KeyphraseScope): Endpoint[] {
  const getKeyphrases: Endpoint = {
    path: KEYPHRASES_ENDPOINT_PATH,
    method: "get",
    handler: async (req) => {
      const ref = await readAuthorizedRef(req, req.query, scope);
      if (ref instanceof Response) return ref;

      const [row, canUpdate] = await Promise.all([findRow(req, ref), canUpdateDoc(req, ref)]);

      return Response.json({
        keyphrases: sanitizeStoredKeyphrases(row?.keyphrases),
        indexed: Boolean(row),
        canUpdate,
      });
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
        return Response.json({ error: "Invalid request" }, { status: 400 });
      }

      const write = {
        keyphrases: sanitizeStoredKeyphrases(body.keyphrases),
        ifAbsent: body.ifAbsent === true,
      };
      const row = await findRow(req, ref);

      if (row) return writeToExistingRow(req, row, write);
      if (write.keyphrases.length === 0) return Response.json({ keyphrases: [] });

      return createRow(req, ref, write);
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
      if (!intent) return Response.json({ docs: [] });

      const rows = await findRowsSharingIntent(req, ref, intent, scope.collections);
      const targets = rows.map((row) => ({ collection: row.docCollection, docId: row.docId }));
      const found = await findReadableDocs(req, targets, { locale: ref.locale, titleOnly: true });

      return Response.json({ docs: found.map(({ summary }) => summary) });
    },
  };

  return [getKeyphrases, putKeyphrases, getUsage];
}
