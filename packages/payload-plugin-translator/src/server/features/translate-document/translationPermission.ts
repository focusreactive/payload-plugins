import { PermissionCheckFailed } from "./PermissionCheckFailed.js";
import { RequesterMissing } from "./RequesterMissing.js";
import type { CollectionSlug, Payload } from "payload";
import { createLocalReq, docAccessOperation } from "payload";

import type { RequestScope, Requester } from "../../shared/payload/RequestScope.shapes.js";
import { freshReq } from "../../shared/payload/RequestScope.shapes.js";

/**
 * A refusal is an **absent key** — Payload's sanitizer deletes what it set to `false` — so
 * `update: false` is a value it cannot emit and a refused collection arrives as nothing at all. A
 * grant is the literal `true`, or `{ permission: true, where }` when the rule returned a query, which
 * has already been run against this document.
 */
type Grant = boolean | { permission?: boolean };

type DocPermissions = { update?: Grant };

function isGranted(value: Grant | undefined): boolean {
  if (value === true) return true;
  return typeof value === "object" && value !== null && value.permission === true;
}

type LocalRequest = Awaited<ReturnType<typeof createLocalReq>>;

/**
 * `docAccessOperation` is generic over the host's own slugs and wants Payload's sanitized
 * `Collection`, neither of which a plugin registered at config time can name.
 */
type EvaluateDocAccess = (args: {
  id: string;
  collection: unknown;
  data: Record<string, unknown>;
  req: LocalRequest;
}) => Promise<DocPermissions>;

type BuildLocalRequest = (
  args: {
    user: Record<string, unknown>;
    req: { transactionID?: string | number };
    locale: string;
  },
  payload: Payload
) => Promise<LocalRequest>;

const evaluateDocAccess = docAccessOperation as unknown as EvaluateDocAccess;
const buildLocalRequest = createLocalReq as unknown as BuildLocalRequest;

export type TranslationPermission = {
  allowed: boolean;
  /**
   * The requester, already rebuilt at auth depth, so a caller passing `overrideAccess: false` need not
   * look them up again. `null` when unattributed.
   */
  user: Record<string, unknown> | null;
};

const ALLOW_ALL: TranslationPermission = { allowed: true, user: null };

type PermissionQuery = {
  payload: Payload;
  collection: CollectionSlug;
  id: string;
  data: Record<string, unknown>;
  targetLocale: string;
  scope: RequestScope;
};

async function evaluate(args: Parameters<EvaluateDocAccess>[0]): Promise<DocPermissions> {
  try {
    return await evaluateDocAccess(args);
  } catch (error) {
    throw new PermissionCheckFailed(
      error instanceof Error ? error.message : "the access rules could not be evaluated",
      { cause: error }
    );
  }
}

/**
 * The one read that deliberately does **not** join the caller's transaction: the requester was
 * committed long before this request, and joining would let a failed lookup roll the caller's save
 * back through `killTransaction`.
 */
async function findRequester(payload: Payload, requester: Requester) {
  const collection = requester.userCollection as CollectionSlug;
  const auth = payload.collections[collection]?.config?.auth;
  const user = await payload.findByID({
    collection,
    id: requester.userId,
    depth: typeof auth === "object" ? auth.depth : undefined,
    overrideAccess: true,
  });
  return user ? { ...user, collection: requester.userCollection } : null;
}

/**
 * Whether the collection's rules allow this exact payload to be written, asked of an already-rebuilt
 * requester so a caller with several writes pays for one lookup.
 *
 * `data` must be the payload that write will send. Payload evaluates the same rule with the same
 * argument (`updateByID`: `executeAccess({ id, data, req })`), so a rule reading `data` gives one
 * answer here and a different one at the write if it is asked about anything else — and at the write
 * a refusal is a `Forbidden` inside the caller's transaction.
 */
export async function mayWrite(query: {
  payload: Payload;
  collection: CollectionSlug;
  id: string;
  data: Record<string, unknown>;
  targetLocale: string;
  scope: RequestScope;
  user: Record<string, unknown>;
}): Promise<boolean> {
  const { payload, collection, id, data, targetLocale, scope, user } = query;

  const req = await buildLocalRequest(
    { user, req: freshReq(scope), locale: targetLocale },
    payload
  );

  const permissions = await evaluate({
    id,
    collection: payload.collections[collection],
    data,
    req,
  });
  return isGranted(permissions.update);
}

/**
 * Asks Payload's own evaluator (`docAccessOperation`, the one behind `/api/<slug>/access`) instead of
 * attempting the write and catching `Forbidden`: by the time a refusal is caught, Payload has rolled
 * the caller's transaction back from its own catch, and the editor's save is gone with it.
 */
export async function checkTranslationPermission(
  query: PermissionQuery
): Promise<TranslationPermission> {
  const { payload, collection, id, data, targetLocale, scope } = query;
  const requester = scope.requester;
  if (!requester) return ALLOW_ALL;

  const user = await findRequester(payload, requester).catch(() => null);
  if (!user) {
    throw new RequesterMissing(requester.userId, requester.userCollection);
  }

  const allowed = await mayWrite({ payload, collection, id, data, targetLocale, scope, user });
  return { allowed, user };
}
