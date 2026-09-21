import type { CollectionSlug, Payload } from "payload";
import { APIError, createLocalReq, docAccessOperation } from "payload";

import { markFailureReason } from "../../../core/domain/translation-providers/failureReason";

import type { RequestScope } from "./RequestScope.shapes";
import { freshReq, isAttributed } from "./RequestScope.shapes";
import type { Requester } from "./RequestScope.shapes";

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

/**
 * Rethrown as `APIError` so {@link killedTheCallersTransaction} recognises it: `docAccessOperation`
 * kills the transaction from its own catch, including for an ordinary `TypeError` out of a host rule.
 */
async function evaluate(args: Parameters<EvaluateDocAccess>[0]): Promise<DocPermissions> {
  try {
    return await evaluateDocAccess(args);
  } catch (error) {
    throw new APIError(
      markFailureReason(
        "permission-check-failed",
        error instanceof Error ? error.message : "the access rules could not be evaluated"
      ),
      500
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
    // The depth Payload authenticates at, so a rule reading `user.role.name` sees what it would on
    // the editor's own save; at depth 0 it finds an id and refuses, or throws — and a throw here
    // costs the caller their transaction.
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

  // Payload's own builder: a host rule may read anything a real request carries (`headers`, `i18n`,
  // `context`), and a `TypeError` off a stand-in is answered with `killTransaction`. The transaction
  // must travel too — a `Where` rule is resolved by counting rows, and on PostgreSQL a count outside
  // the caller's transaction cannot see the uncommitted document, so the rule answers "allowed"
  // (#124). The locale too, or the rules answer about the project default.
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
 * attempting the write and catching `Forbidden`: a caught refusal has already been through
 * {@link killedTheCallersTransaction}'s rollback and would discard the editor's own save.
 */
export async function checkTranslationPermission(
  query: PermissionQuery
): Promise<TranslationPermission> {
  const { payload, collection, id, data, targetLocale, scope } = query;
  if (!isAttributed(scope)) return ALLOW_ALL;

  const user = await findRequester(payload, scope).catch(() => null);
  if (!user) {
    // Plain `Error`, not `APIError`: nothing ran here that could have rolled the caller's
    // transaction back.
    throw new Error(
      markFailureReason(
        "requester-missing",
        `the requester (${String(scope.userId)} in "${String(scope.userCollection)}") could not be looked up`
      )
    );
  }

  const allowed = await mayWrite({ payload, collection, id, data, targetLocale, scope, user });
  return { allowed, user };
}
