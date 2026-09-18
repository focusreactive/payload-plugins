import type { CollectionSlug, Payload } from "payload";
import { APIError, createLocalReq, docAccessOperation } from "payload";

import { markFailureReason } from "../../../core/domain/translation-providers/failureReason";

import type { RequestScope } from "./RequestScope.shapes";
import { freshReq, isAttributed } from "./RequestScope.shapes";

/**
 * Payload's sanitized permission shape, which is why every predicate below reads the way it does.
 *
 * A refusal is an **absent key**, never `false`: the sanitizer writes `false` and deletes the key in
 * the same breath, then deletes any object it emptied. So a field declaring `access: { update: () =>
 * false }` comes back as `{ create: true, read: true }`, a field refusing every operation disappears
 * from `fields` entirely, and a collection refusing every operation comes back as `{}`. Anything that
 * allows everything collapses the other way, to the literal `true` — which `fields` and `blocks`
 * themselves can become, not just a single field.
 *
 * A rule that returns a `Where` keeps its object, `{ permission: true, where: … }`, because the query
 * has already been run against this document by the time we see it.
 */
type Grant = boolean | { permission?: boolean };

type FieldPermission =
  | true
  | { update?: Grant; fields?: FieldPermissions | true; blocks?: BlockPermissions | true };
type FieldPermissions = Record<string, FieldPermission | undefined>;
type BlockPermissions = Record<string, true | { fields?: FieldPermissions | true } | undefined>;

/** What the evaluator answers, as much of it as this file reads. */
type DocPermissions = { update?: Grant; fields?: FieldPermissions | true };

/**
 * Row identity and the block discriminator. Payload reports no permission for these, and reading
 * their absence as a refusal would prune an array row's `id` — which makes Payload rebuild the row
 * and lose the non-localized siblings it shares across every locale.
 *
 * None of the three is a reserved field name, so a host may legitimately declare a translatable field
 * called `blockName`. When it does, Payload reports a permission for it like any other, and the walk
 * below honours it: only the *absence* is excused here, never a refusal.
 */
const STRUCTURAL_KEYS = new Set(["id", "blockType", "blockName"]);

function isGranted(value: Grant | undefined): boolean {
  if (value === true) return true;
  return typeof value === "object" && value !== null && value.permission === true;
}

/**
 * What `docAccessOperation` accepts, named locally so the call stays type-checked.
 *
 * Its published signature is generic over the host's own collection slugs and expects the sanitized
 * `Collection` object, neither of which a plugin registered at config time can name. Casting the
 * *function* once against a declared signature keeps every argument at the call site checked, which
 * erasing the argument with `as never` would not.
 */
type LocalRequest = Awaited<ReturnType<typeof createLocalReq>>;

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
 * Every path in `data` the rules refuse, walking into groups, arrays, tabs and blocks.
 *
 * A rule declared on `meta.subtitle` is reported by Payload under a nested `fields`, never at the top
 * level — so a check that only looked at top-level names would honour no nested rule at all. Reporting
 * the leaf path rather than its container is what lets the write keep the siblings the rules allow.
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
    // Absent means the sanitizer emptied it — every operation refused — so this is the shape a field
    // that hides itself from the requester takes, not a field nobody mentioned.
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
    // Blocks are reported under a key of their own, one entry per block slug, each carrying its own
    // `fields`. Read only `fields` and a blocks field looks unremarkable, so no rule declared inside
    // one is honoured at all.
    if (permission.blocks !== undefined && permission.blocks !== true && Array.isArray(child)) {
      for (const row of child) {
        if (row === null || typeof row !== "object") continue;
        const slug = (row as Record<string, unknown>).blockType;
        const block = typeof slug === "string" ? permission.blocks[slug] : undefined;
        if (block === true) continue;
        // An absent slug is a block the rules refuse outright; `{}` then refuses each of its fields.
        denied.push(...deniedPaths(block?.fields ?? {}, row, path));
      }
    }
  }
  // A leaf path carries no row index, so the same name refused in one row is refused in every row of
  // that field — conservative in the direction that loses a translation rather than writes a refused
  // one, and the reason a name can be named twice here.
  return [...new Set(denied)];
}

/** What the host's rules allow this write to do. */
export type TranslationPermission = {
  /** False when the collection refuses the write outright; nothing should be written. */
  allowed: boolean;
  /**
   * Dot-separated paths the caller may not write — `title`, `meta.subtitle`. Paths rather than names
   * because a rule may sit on a field nested in a group, an array row or a tab, and dropping the
   * whole container to honour one leaf would throw away the siblings it allows.
   */
  deniedFields: string[];
  /**
   * The requester, rebuilt, when there was one — so a caller that can afford Payload's own
   * enforcement at the write does not have to look them up a second time. `null` for an
   * unattributed request.
   */
  user: Record<string, unknown> | null;
};

const ALLOW_ALL: TranslationPermission = { allowed: true, deniedFields: [], user: null };

type PermissionQuery = {
  payload: Payload;
  collection: CollectionSlug;
  id: string;
  data: Record<string, unknown>;
  /** The locale being written, not the one being read: it is the write the rules are deciding. */
  locale: string;
  scope: RequestScope;
};

/**
 * Run Payload's evaluator, and make its failure legible.
 *
 * It calls `killTransaction` from its own catch, so by the time a throw reaches us the caller's save
 * is already rolled back — including when the thrown thing is an ordinary `TypeError` from a host
 * rule reading `user.role.name` on a null role. Rethrowing it as an `APIError` is what lets
 * `killedTheCallersTransaction` recognise it further up and surface the loss; left as a plain error
 * it would be swallowed as best-effort and the editor would be told their save succeeded.
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
 * `user.collection` is what Payload's own access evaluation keys on; an id alone is not enough.
 *
 * Deliberately the one read that does **not** join the caller's transaction. The requester is a row
 * committed long before this request, so there is nothing to miss — and joining would mean a failed
 * lookup rolls the caller's save back through `killTransaction`, which is exactly what the plain
 * error below promises has not happened.
 */
async function findRequester(payload: Payload, scope: RequestScope) {
  const collection = scope.userCollection as CollectionSlug;
  const auth = payload.collections[collection]?.config?.auth;
  const user = await payload.findByID({
    collection,
    id: scope.userId as string,
    // The depth Payload authenticates at, so the rules see the user they would have seen on the
    // editor's own save. At depth 0 a rule reading `user.role.name` finds an id and answers no,
    // refusing a translation for somebody who may in fact write; one that reaches a level deeper
    // throws instead, and a throw here costs the caller their transaction. `undefined` is Payload's
    // own answer when the collection declares no depth — it falls through to `defaultDepth`.
    depth: typeof auth === "object" ? auth.depth : undefined,
    overrideAccess: true,
  });
  return user ? { ...user, collection: scope.userCollection } : null;
}

/**
 * Ask whether this write is allowed, rather than attempting it and catching the refusal.
 *
 * The distinction is load-bearing. `Forbidden` extends `APIError`, and every Payload write operation
 * calls `killTransaction` from its catch — which rolls back whatever transaction the request carries
 * without checking whose it is. On the inline path that transaction belongs to the editor's own save,
 * so a refused translation would discard their work. Asking first means nothing ever reaches that
 * catch.
 *
 * `docAccessOperation` is Payload's own evaluator — the one behind `/api/<slug>/access` — and it
 * returns a permissions object instead of throwing. It reports field-level permissions too, so a
 * field the caller may not write is dropped from the payload rather than failing the whole
 * translation.
 *
 * An unattributed scope allows everything: a request with no identity is the host's own server-side
 * code, or a job queued before the requester was recorded, and both keep the behaviour they had.
 */
export async function checkTranslationPermission(
  query: PermissionQuery
): Promise<TranslationPermission> {
  const { payload, collection, id, data, locale, scope } = query;
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

  // A real request, not a hand-rolled stand-in. The host's own access rules receive this object and
  // are entitled to everything Payload always puts on one — `req.headers`, `req.i18n`, `req.context`
  // — and a rule reading one of those off a bare `{ payload, user }` throws a `TypeError`, which
  // `docAccessOperation` answers by rolling the caller's transaction back. Building it properly is
  // what keeps a correct rule from destroying the editor's save.
  //
  // The transaction travels with it: an access rule that returns a `Where` is resolved by counting
  // matching rows, and on PostgreSQL a count outside the caller's transaction cannot see a document
  // the caller has not committed — so the rule would be applied to nothing and answer "allowed",
  // which is the #124 shape exactly. The cost is named rather than hidden: `docAccessOperation`
  // calls `killTransaction` if it throws, so a rule that throws for its own reasons still takes the
  // save with it, and `evaluate` makes that loss visible instead of silent.
  //
  // So does the locale. `createLocalReq` fills an absent one from the project's default, and the
  // rules are then asked about a locale nobody is writing — "may this user write English?" answered
  // and used to authorise a write to German. `req.locale !== "de"` is the ordinary way a host says
  // an editor owns one locale and not another, and it is exactly the shape that would have been
  // read backwards.
  const req = await buildLocalRequest({ user, req: freshReq(scope), locale }, payload);

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
