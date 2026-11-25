// Who may read workflow runs and their history. One rule for both collections (`workflow-instances`
// and `workflow-events`), expressed on the subject columns both carry, so the database applies it
// in every query: lists, counts, REST, GraphQL and the plugin's own reads.

import type { Access, CollectionSlug, PayloadRequest, Where } from "payload";

import { READ_CACHE } from "../constants.js";
import type { WorkflowsSettings } from "../plugin.js";

/**
 * Readable ids resolved for a subject collection whose `read` access is a per-document rule. Above
 * this the collection is left out of the runs the user may read (logged once, and named in the
 * plugin's list and state answers as `hiddenCollections`): one query, and an `IN` list well under
 * SQLite's and Postgres' bound-parameter limits.
 */
export const READABLE_IDS_CAP = 5000;

const warnedOverCap = new Set<string>();

/** `readWorkflows`' answer, kept on `req.context` so one request resolves it once per user. */
interface ReadCache {
  user: string;
  result: boolean | Where;
  /** Subject collections left out because the user may read more than the cap of them. */
  hidden: string[];
}

/** Subject collections whose runs `readWorkflows` hid from this request's user (over the cap). */
export const hiddenCollectionsOf = (req: PayloadRequest): string[] =>
  (req.context?.[READ_CACHE] as ReadCache | undefined)?.hidden ?? [];

/**
 * Who may read runs and their events: a user of the admin user collection, and only those on
 * documents they may read. Both collections call this one function, and its answer constrains only
 * `subjectCollection` / `subjectId`, which both carry: a viewer never sees an event of a run they
 * cannot see.
 * Each subject collection's own `read` access decides for `req`: `false` leaves its runs out,
 * `true` lets them all in, a query constraint (a per-document rule) lets in the runs on the ids it
 * allows, resolved with one query as the user (latest drafts, as the plugin's own reads). A user who
 * may read every subject collection whole gets no constraint at all; one who may read none, a
 * constraint nothing matches. Resolved once per request and user (`req.context`).
 */
export const readWorkflows: Access = async ({ req }): Promise<boolean | Where> => {
  const { user, payload } = req;
  if (!user || user.collection !== payload.config.admin?.user) {
    return false;
  }
  const key = `${user.collection}:${String(user.id)}`;
  const cached = req.context?.[READ_CACHE] as ReadCache | undefined;
  if (cached?.user === key) {
    return cached.result;
  }
  const settings = payload.config.custom?.workflows as WorkflowsSettings | undefined;
  const slugs = [...new Set(settings?.workflows.flatMap((def) => def.collections))];
  const or: Where[] = [];
  const hidden: string[] = [];
  let whole = true;
  for (const slug of slugs) {
    const collection = payload.collections[slug as CollectionSlug];
    const access = collection?.config.access?.read;
    // No function: Payload's default, any logged-in user.
    const result = collection ? (access ? await access({ req }) : true) : false;
    if (result === true) {
      or.push({ subjectCollection: { equals: slug } });
      continue;
    }
    whole = false;
    if (!result || typeof result !== "object") {
      continue;
    }
    const found = await payload.find({
      collection: slug as CollectionSlug,
      select: { id: true },
      draft: true,
      limit: READABLE_IDS_CAP + 1,
      pagination: false,
      overrideAccess: false,
      user,
      req,
    });
    if (found.docs.length > READABLE_IDS_CAP) {
      hidden.push(slug);
      if (!warnedOverCap.has(slug)) {
        warnedOverCap.add(slug);
        payload.logger.warn(
          `workflows: a user may read more than ${READABLE_IDS_CAP} "${slug}" documents under its per-document read access, so workflow runs on "${slug}" are hidden from them (runs collection, workflow lists and the dashboard widget, which say so).`
        );
      }
      continue;
    }
    if (found.docs.length > 0) {
      or.push({
        and: [
          { subjectCollection: { equals: slug } },
          { subjectId: { in: found.docs.map((doc) => String(doc.id)) } },
        ],
      });
    }
  }
  // Not `false`: that is a 403, and the plugin's reads would turn an empty list into `not-allowed`.
  let result: boolean | Where = true;
  if (!whole) {
    result = or.length > 0 ? { or } : { id: { exists: false } };
  }
  if (req.context) {
    req.context[READ_CACHE] = { user: key, result, hidden } satisfies ReadCache;
  }
  return result;
};
