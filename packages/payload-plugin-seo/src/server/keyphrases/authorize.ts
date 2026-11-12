import { docAccessOperation } from "payload";
import type { PayloadRequest } from "payload";
import { PLUGIN_NAME } from "../../constants";
import { readDocTarget } from "./docRef";
import type { DocTarget } from "../../keyphrases/docTarget";
import type { DocRef, KeyphraseScope } from "./types";

type DocOperation = "read" | "update";

function resolveLocale(req: PayloadRequest, source: unknown, scope: KeyphraseScope): string | null {
  const { localization } = req.payload.config;
  if (!localization) return scope.locales[0] ?? null;

  const { locale } = (source ?? {}) as Record<string, unknown>;

  return typeof locale === "string" && localization.localeCodes.includes(locale) ? locale : null;
}

async function attemptAccessCheck<T>(
  req: PayloadRequest,
  check: () => Promise<T>
): Promise<T | null> {
  try {
    return await check();
  } catch (err) {
    req.payload.logger.warn({ err }, `[${PLUGIN_NAME}] keyphrase access check failed`);
    return null;
  }
}

async function findReadableDocId(req: PayloadRequest, target: DocTarget): Promise<string | null> {
  const doc = await attemptAccessCheck(req, () =>
    req.payload.findByID({
      collection: target.collection,
      id: target.docId,
      depth: 0,
      select: {},
      req,
      overrideAccess: false,
      disableErrors: true,
    })
  );

  return doc ? String(doc.id) : null;
}

function isGranted(grant: unknown): boolean {
  if (grant === true) return true;

  return (
    typeof grant === "object" &&
    grant !== null &&
    "permission" in grant &&
    grant.permission === true
  );
}

export async function canUpdateDoc(req: PayloadRequest, ref: DocRef): Promise<boolean> {
  const collection = req.payload.collections[ref.collection];
  if (!collection) return false;

  const permissions = await attemptAccessCheck(req, () =>
    docAccessOperation({ collection, id: ref.docId, req })
  );

  return isGranted(permissions?.update);
}

export function rejectNonAdmin(req: PayloadRequest): Response | null {
  if (!req.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (req.user.collection !== req.payload.config.admin.user) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
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
  if (!target) return Response.json({ error: "Invalid request" }, { status: 400 });

  const locale = resolveLocale(req, source, scope);
  if (!locale) return Response.json({ error: "Invalid request" }, { status: 400 });

  const docId = await findReadableDocId(req, target);
  if (!docId) return Response.json({ error: "Not found" }, { status: 404 });

  const ref = { collection: target.collection, docId, locale };

  if (operation === "update" && !(await canUpdateDoc(req, ref))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return ref;
}
