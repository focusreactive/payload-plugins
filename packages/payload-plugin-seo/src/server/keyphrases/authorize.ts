import { executeAccess } from "payload";
import type { PayloadRequest, Where } from "payload";
import { PLUGIN_NAME } from "../../constants";
import { jsonResponse } from "../http";
import { readDocTarget } from "./docRef";
import type { DocTarget } from "../../keyphrases/docTarget";
import type { DocRef, KeyphraseScope } from "./types";

export type DocOperation = "read" | "update";

function resolveLocale(req: PayloadRequest, source: unknown, scope: KeyphraseScope): string | null {
  const { localization } = req.payload.config;
  if (!localization) return scope.locales[0] ?? null;

  const { locale } = (source ?? {}) as Record<string, unknown>;

  return typeof locale === "string" && localization.localeCodes.includes(locale) ? locale : null;
}

async function findReadableDocId(req: PayloadRequest, target: DocTarget): Promise<string | null> {
  try {
    const doc = await req.payload.findByID({
      collection: target.collection,
      id: target.docId,
      depth: 0,
      select: {},
      req,
      overrideAccess: false,
      disableErrors: true,
    });

    return doc ? String(doc.id) : null;
  } catch (err) {
    req.payload.logger.warn({ err }, `[${PLUGIN_NAME}] keyphrase access check failed`);
    return null;
  }
}

async function matchesConstraint(
  req: PayloadRequest,
  ref: DocRef,
  constraint: Where
): Promise<boolean> {
  const { docs } = await req.payload.find({
    collection: ref.collection,
    where: { and: [{ id: { equals: ref.docId } }, constraint] },
    limit: 1,
    depth: 0,
    pagination: false,
    select: {},
    overrideAccess: true,
    req,
    locale: ref.locale,
  });

  return docs.length > 0;
}

export async function canUpdateDoc(req: PayloadRequest, ref: DocRef): Promise<boolean> {
  const collectionConfig = req.payload.collections[ref.collection]?.config;
  if (!collectionConfig) return false;

  try {
    const access = await executeAccess(
      { id: ref.docId, collectionConfig, disableErrors: true, req },
      collectionConfig.access.update
    );

    return typeof access === "object" ? await matchesConstraint(req, ref, access) : Boolean(access);
  } catch (err) {
    req.payload.logger.warn({ err }, `[${PLUGIN_NAME}] keyphrase access check failed`);
    return false;
  }
}

export function rejectNonAdmin(req: PayloadRequest): Response | null {
  if (!req.user) return jsonResponse({ error: "Unauthorized" }, 401);
  if (req.user.collection !== req.payload.config.admin.user) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  return null;
}

export async function readAuthorizedRef(
  req: PayloadRequest,
  source: unknown,
  scope: KeyphraseScope,
  operation: DocOperation = "read"
): Promise<DocRef | Response> {
  const rejected = rejectNonAdmin(req);
  if (rejected) return rejected;

  const target = readDocTarget(source, scope.collections);
  if (!target) return jsonResponse({ error: "Invalid request" }, 400);

  const locale = resolveLocale(req, source, scope);
  if (!locale) return jsonResponse({ error: "Invalid request" }, 400);

  const docId = await findReadableDocId(req, target);
  if (!docId) return jsonResponse({ error: "Not found" }, 404);

  const ref = { collection: target.collection, docId, locale };

  if (operation === "update" && !(await canUpdateDoc(req, ref))) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  return ref;
}
