import type { CollectionSlug, Payload } from "payload";
import { APIError, createLocalReq, docAccessOperation } from "payload";

import { markFailureReason } from "../../../core/domain/translation-providers/failureReason";

import type { RequestScope } from "./RequestScope.shapes";
import { freshReq, isAttributed } from "./RequestScope.shapes";
import type { Requester } from "./RequestScope.shapes";

/**
 * Payload 3.84.1's sanitized permission shape (`utilities/sanitizePermissions.js`).
 *
 * A refusal is an **absent key** — the sanitizer writes `false`, deletes the key, then deletes any
 * object it emptied — so `update: false` is a value Payload cannot emit, and a fully-refused field or
 * collection arrives as nothing at all. A fully-allowed one collapses the other way, to the literal
 * `true`, which `fields` and `blocks` may themselves become.
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

/** An absent block slug is one the rules refuse outright, so every field of such a row is refused. */
const REFUSE_EVERY_FIELD: FieldPermissions = {};

// `{ permission: true, where }` is a grant: `docAccessOperation` has already run the query against
// this document.
function isGranted(value: Grant | undefined): boolean {
  if (value === true) return true;
  return typeof value === "object" && value !== null && value.permission === true;
}

type LocalRequest = Awaited<ReturnType<typeof createLocalReq>>;

/**
 * `docAccessOperation` is generic over the host's own slugs and wants Payload's sanitized
 * `Collection`, neither of which a plugin registered at config time can name. The cast is on the
 * *function*, once, so every argument at the call site stays checked — `as never` on the argument
 * would check nothing.
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

/**
 * Payload reports a rule on `meta.subtitle` under a nested `fields`, never at the top level, so the
 * walk has to descend; the leaf path is reported rather than its container, which is what lets the
 * write keep the siblings the rules allow.
 */
function deniedPaths(fields: FieldPermissions | true, data: unknown, prefix = ""): string[] {
  if (fields === true) return [];
  if (data === null || typeof data !== "object") return [];
  // An array's rows share one set of field rules, so a refusal inside one row refuses that leaf in
  // every row; the path carries no index.
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
  // Two rows of the same blocks field can refuse the same leaf.
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
    // The depth Payload authenticates at, so the rules see the user they would have seen on the
    // editor's own save. At depth 0 a rule reading `user.role.name` finds an id and answers no,
    // refusing a translation for somebody who may in fact write; one that reaches a level deeper
    // throws instead, and a throw here costs the caller their transaction. `undefined` is Payload's
    // own answer when the collection declares no depth — it falls through to `defaultDepth`.
    depth: typeof auth === "object" ? auth.depth : undefined,
    overrideAccess: true,
  });
  return user ? { ...user, collection: requester.userCollection } : null;
}

/**
 * Asks Payload's own evaluator (`docAccessOperation`, the one behind `/api/<slug>/access`) instead of
 * attempting the write and catching `Forbidden`: a caught refusal has already been through
 * {@link killedTheCallersTransaction}'s rollback and would discard the editor's own save.
 *
 * Field-level answers come back too, so a refused field is dropped rather than failing the locale.
 */
export async function checkTranslationPermission(
  query: PermissionQuery
): Promise<TranslationPermission> {
  const { payload, collection, id, data, targetLocale, scope } = query;
  if (!isAttributed(scope)) return ALLOW_ALL;

  const user = await findRequester(payload, scope).catch(() => null);
  if (!user) {
    // A plain error on purpose: nothing has been written and no Payload operation ran that could
    // have rolled the caller's transaction back, so this must not read as a destroyed save.
    throw new Error(
      markFailureReason(
        "requester-missing",
        `the requester (${String(scope.userId)} in "${String(scope.userCollection)}") could not be looked up`
      )
    );
  }

  // Payload's own request builder, because a host rule may read anything a real request carries —
  // `headers`, `i18n`, `context` — and a `TypeError` off a stand-in is answered with `killTransaction`.
  // The transaction has to travel: a `Where` rule is resolved by counting rows, and on PostgreSQL a
  // count outside the caller's transaction cannot see the uncommitted document, so the rule is applied
  // to nothing and answers "allowed" — issue #124. The locale likewise, or `createLocalReq` substitutes
  // the project default and the rules answer about the wrong one.
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
