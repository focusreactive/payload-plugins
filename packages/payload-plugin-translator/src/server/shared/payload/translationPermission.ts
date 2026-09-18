import type { CollectionSlug, Payload } from "payload";
import { APIError, createLocalReq, docAccessOperation } from "payload";

import { markFailureReason } from "../../../core/domain/translation-providers/failureReason";

import type { RequestScope } from "./RequestScope.shapes";
import { freshReq, isAttributed } from "./RequestScope.shapes";
import type { Requester } from "./RequestScope.shapes";

/**
 * Payload 3.84.1's sanitized permission shape (`utilities/sanitizePermissions.js`).
 *
 * A refusal is an **absent key** — the sanitizer deletes what it set to `false`, then deletes the
 * object it emptied — so a refused field or collection arrives as nothing at all and `update: false`
 * cannot occur. A fully-allowed one collapses to the literal `true`, which `fields` and `blocks` may
 * themselves become. `{ permission: true, where }` is a grant: the query has already been run against
 * this document.
 */
type Grant = boolean | { permission?: boolean };

type FieldPermission =
  | true
  | { update?: Grant; fields?: FieldPermissions | true; blocks?: BlockPermissions | true };
type FieldPermissions = Record<string, FieldPermission | undefined>;
type BlockPermissions = Record<string, true | { fields?: FieldPermissions | true } | undefined>;

type DocPermissions = { update?: Grant; fields?: FieldPermissions | true };

/**
 * Payload reports no permission for row identity or the block discriminator. Reading their absence as
 * a refusal would prune an array row's `id`, which makes Payload rebuild the row and lose the
 * non-localized siblings it shares across every locale.
 */
const STRUCTURAL_KEYS = new Set(["id", "blockType", "blockName"]);

const REFUSE_EVERY_FIELD: FieldPermissions = {};

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

/** Leaf paths only: a container whose children are allowed is not reported, so the write keeps the
 * siblings the rules allow. */
function deniedPaths(fields: FieldPermissions | true, data: unknown, prefix = ""): string[] {
  if (fields === true) return [];
  if (data === null || typeof data !== "object") return [];
  // Rows share one rule set, so a refusal in any row refuses that leaf in all of them.
  if (Array.isArray(data)) {
    const merged = new Set<string>();
    for (const row of data) for (const path of deniedPaths(fields, row, prefix)) merged.add(path);
    return [...merged];
  }

  const denied: string[] = [];
  for (const name of Object.keys(data as Record<string, unknown>)) {
    const permission = fields[name];
    if (permission === undefined && STRUCTURAL_KEYS.has(name)) continue;
    if (permission === true) continue;
    const path = prefix ? `${prefix}.${name}` : name;
    if (permission === undefined || !isGranted(permission.update)) {
      denied.push(path);
      continue;
    }

    const child = (data as Record<string, unknown>)[name];
    // A leaf declares neither: recursing into one would walk the *value's* own keys — a rich text
    // document's `root`, a relationship's `value` — and read every one of them as a refused field.
    if (permission.fields !== undefined) {
      denied.push(...deniedPaths(permission.fields, child, path));
    }
    if (permission.blocks !== undefined && permission.blocks !== true && Array.isArray(child)) {
      for (const row of child) {
        if (row === null || typeof row !== "object") continue;
        const slug = (row as Record<string, unknown>).blockType;
        const block = typeof slug === "string" ? permission.blocks[slug] : undefined;
        if (block === true) continue;
        denied.push(...deniedPaths(block?.fields ?? REFUSE_EVERY_FIELD, row, path));
      }
    }
  }
  return [...new Set(denied)];
}

export type TranslationPermission = {
  allowed: boolean;
  /** Dot-separated paths the caller may not write — `title`, `meta.subtitle`. No row indices. */
  deniedFields: string[];
  /**
   * The requester, already rebuilt at auth depth, so a caller passing `overrideAccess: false` need not
   * look them up again. `null` when unattributed.
   */
  user: Record<string, unknown> | null;
};

const ALLOW_ALL: TranslationPermission = { allowed: true, deniedFields: [], user: null };

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

  return {
    allowed: isGranted(permissions.update),
    deniedFields: deniedPaths(permissions.fields ?? {}, data),
    user,
  };
}
