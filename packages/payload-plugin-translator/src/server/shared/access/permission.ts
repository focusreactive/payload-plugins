import { PermissionCheckFailed } from "./PermissionCheckFailed.js";
import { RequesterMissing } from "./RequesterMissing.js";
import type { CollectionSlug, Payload } from "payload";
import { createLocalReq, docAccessOperation, NotFound } from "payload";

import type { RequestScope, Requester } from "../payload/RequestScope.shapes.js";
import { freshReq } from "../payload/RequestScope.shapes.js";

/**
 * Payload's sanitizer deletes the keys it set to `false` (`utilities/sanitizePermissions.js`, 3.90.1),
 * so a refusal arrives as an absent key and `update: false` is never emitted. `{ permission: true }`
 * carries a `where` already run against this document.
 */
type Grant = boolean | { permission?: boolean };

type DocPermissions = { update?: Grant };

/**
 * A user read back from storage. `collection` is required because Payload resolves the auth
 * collection from it, and `docAccessOperation` cannot evaluate a requester without one.
 */
export type RebuiltRequester = Record<string, unknown> & { collection: string };

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
/** Same constraint as above: `createLocalReq` is generic over the host's own slugs. */
const buildLocalRequest = createLocalReq as unknown as BuildLocalRequest;

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
async function findRequester(
  payload: Payload,
  requester: Requester
): Promise<RebuiltRequester | null> {
  const collection = requester.userCollection as CollectionSlug;
  const user = await payload.findByID({
    collection,
    id: requester.userId,
    // The depth Payload itself authenticates at: a rule reading a populated relationship off the
    // user must see the same shape here as it will at the write.
    depth: payload.collections[collection]?.config?.auth?.depth,
    overrideAccess: true,
  });
  return user ? { ...user, collection: requester.userCollection } : null;
}

/**
 * Whether the collection's rules allow this exact payload to be written.
 *
 * `data` must be the payload the write will send: Payload asks the same rule with the same argument
 * (`updateByID` → `executeAccess({ id, data, req })`), so asking with anything else can answer
 * differently from the write — where a refusal is a `Forbidden` inside the caller's transaction.
 */
export async function mayWrite(query: {
  payload: Payload;
  collection: CollectionSlug;
  id: string;
  data: Record<string, unknown>;
  targetLocale: string;
  scope: RequestScope;
  user: RebuiltRequester;
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

export async function rebuildRequester(
  payload: Payload,
  scope: RequestScope
): Promise<RebuiltRequester | null> {
  const requester = scope.requester;
  if (!requester) return null;

  const user = await findRequester(payload, requester).catch(() => null);
  if (!user) {
    throw new RequesterMissing(requester.userId, requester.userCollection);
  }
  return user;
}

/**
 * Asks Payload's evaluator rather than attempting the write and catching `Forbidden` — see
 * {@link PermissionCheckFailed} for why a caught refusal is already too late. A `null` user
 * answers `true`.
 */
export async function checkTranslationPermission(
  query: PermissionQuery & { user: RebuiltRequester | null }
): Promise<boolean> {
  const { payload, collection, id, data, targetLocale, scope, user } = query;
  if (!user) return true;

  return await mayWrite({ payload, collection, id, data, targetLocale, scope, user });
}

/**
 * With empty `data` Payload's evaluator loads the document itself, so a missing document throws
 * `NotFound` out of the ask rather than refusing.
 */
function absenceIsNotARefusal(error: unknown): boolean {
  if (error instanceof PermissionCheckFailed && error.cause instanceof NotFound) return true;
  throw error;
}

/** `createLocalReq` wants a locale; a project without localization has none to give. */
const NOT_LOCALISED = "";

/**
 * Could this person save this document at all. Asked with empty `data`, so a host rule that reads
 * the payload answers a different question here than at the write — never authorise a write with
 * this; use {@link mayWrite}. A `null` user answers `true`.
 *
 * The locale is this function's to pick, not a caller's: rights in Payload have no language, but
 * empty `data` makes Payload load the document to answer, and a rule reading the document would
 * then answer per locale. Asked once, in the project's default locale, so every route agrees.
 */
export async function mayInitiate(
  query: Omit<PermissionQuery, "data" | "scope" | "targetLocale"> & {
    user: RebuiltRequester | null;
  }
): Promise<boolean> {
  const targetLocale = query.payload.config?.localization
    ? query.payload.config.localization.defaultLocale
    : NOT_LOCALISED;

  return checkTranslationPermission({ ...query, data: {}, scope: {}, targetLocale }).catch(
    absenceIsNotARefusal
  );
}
