// Who may read workflow runs and their history: the `read` access of both collections
// (`workflow-instances` and `workflow-events`), expressed as query constraints, so the database
// applies it in every query: lists, counts, REST, GraphQL and the plugin's own reads.
//
// Two ways to decide, by configuration:
// - `visibility` set: the host's own access rule over facts the runs carry (e.g. a tenant), plus a
//   cheap collection-level check. Nothing is resolved per document; it scales.
// - not set: each subject collection's own `read` access, a per-document rule resolved to the ids
//   it allows (at most `READABLE_IDS_CAP`). Correct with no configuration, for small sites.

import type { Access, AccessArgs, CollectionSlug, PayloadRequest, Where } from "payload";

import { READ_CACHE } from "../constants.js";
import type { WorkflowsSettings } from "../plugin.js";

/**
 * Readable ids resolved for a subject collection whose `read` access is a per-document rule
 * (without `visibility`). Above this the collection is left out of the runs the user may read
 * (logged once, and named in the plugin's list and state answers as `hiddenCollections`): one
 * query, and an `IN` list well under SQLite's and Postgres' bound-parameter limits.
 */
export const READABLE_IDS_CAP = 5000;

const warnedOverCap = new Set<string>();

/** A constraint nothing matches. Not `false`: that is a 403, and an empty list is not a refusal. */
const NOTHING: Where = { id: { exists: false } };

/** The read rule, resolved for one user, kept on `req.context` so a request resolves it once. */
interface ReadCache {
  user: string;
  /** On the subject columns, which both collections carry. */
  subjects: boolean | Where;
  /**
   * The host's `visibility.read` (on the runs' visibility fields; `false`: nothing), `true`
   * without `visibility`.
   */
  visible: boolean | Where;
  /** Subject collections left out because the user may read more than the cap of them. */
  hidden: string[];
}

/** Subject collections whose runs `readWorkflows` hid from this request's user (over the cap). */
export const hiddenCollectionsOf = (req: PayloadRequest): string[] =>
  (req.context?.[READ_CACHE] as ReadCache | undefined)?.hidden ?? [];

/** Each subject collection's own `read` access for `req`; no function is Payload's default. */
const collectionReads = async (req: PayloadRequest) => {
  const settings = req.payload.config.custom?.workflows as WorkflowsSettings | undefined;
  const slugs = [...new Set(settings?.workflows.flatMap((def) => def.collections))];
  const reads: { slug: string; result: boolean | Where }[] = [];
  for (const slug of slugs) {
    const collection = req.payload.collections[slug as CollectionSlug];
    const access = collection?.config.access?.read;
    reads.push({ slug, result: collection ? (access ? await access({ req }) : true) : false });
  }
  return { settings, reads };
};

/**
 * Without `visibility`: the runs on documents the user may read. `true` lets a collection's runs
 * in, `false` keeps them out, a query constraint lets in the runs on the ids it allows, resolved
 * with one query as the user (latest drafts, as the plugin's own reads).
 */
const byReadableIds = async (
  req: PayloadRequest,
  reads: { slug: string; result: boolean | Where }[]
): Promise<{ subjects: boolean | Where; hidden: string[] }> => {
  const { payload, user } = req;
  const or: Where[] = [];
  const hidden: string[] = [];
  let whole = true;
  for (const { slug, result } of reads) {
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
          `workflows: a user may read more than ${READABLE_IDS_CAP} "${slug}" documents under its per-document read access, so workflow runs on "${slug}" are hidden from them (runs collection, workflow lists and the dashboard widget, which say so). Configure the plugin's \`visibility\` option to decide visibility without resolving ids.`
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
  if (whole) {
    return { subjects: true, hidden };
  }
  return { subjects: or.length > 0 ? { or } : NOTHING, hidden };
};

/** The rule for this request's user, resolved once per request (`req.context`). */
const resolve = async (args: AccessArgs): Promise<ReadCache | false> => {
  const { req } = args;
  const { user, payload } = req;
  if (!user || user.collection !== payload.config.admin?.user) {
    return false;
  }
  const key = `${user.collection}:${String(user.id)}`;
  const cached = req.context?.[READ_CACHE] as ReadCache | undefined;
  if (cached?.user === key) {
    return cached;
  }
  const { settings, reads } = await collectionReads(req);
  let resolved: ReadCache;
  if (settings?.visibility) {
    // A collection the user may not read at all keeps its runs out; within the others the host's
    // rule decides, on the runs' own columns. No ids, no cap.
    const closed = reads.filter((entry) => !entry.result).map((entry) => entry.slug);
    resolved = {
      user: key,
      subjects: closed.length > 0 ? { subjectCollection: { not_in: closed } } : true,
      visible: await settings.visibility.read(args),
      hidden: [],
    };
  } else {
    resolved = { user: key, visible: true, ...(await byReadableIds(req, reads)) };
  }
  if (req.context) {
    req.context[READ_CACHE] = resolved;
  }
  return resolved;
};

/** `a` and `b` as one constraint (`true` is no constraint, `false` one nothing matches). */
const both = (a: boolean | Where, b: boolean | Where): boolean | Where => {
  if (a === false || b === false) {
    return NOTHING;
  }
  if (a === true) {
    return b;
  }
  if (b === true) {
    return a;
  }
  return { and: [a as Where, b as Where] };
};

/** Every field path of a constraint, read through `prefix` (`tenant` → `run.tenant`). */
export const throughPath = (where: Where, prefix: string): Where =>
  Object.fromEntries(
    Object.entries(where).map(([key, value]) =>
      key === "and" || key === "or"
        ? [key, (value as Where[]).map((entry) => throughPath(entry, prefix))]
        : [`${prefix}.${key}`, value]
    )
  ) as Where;

/**
 * Who may read runs: a user of the admin user collection, only on subject collections they may
 * read, and then, with `visibility`, the runs its `read` allows (on the runs' visibility fields),
 * else the runs on documents they may read.
 */
export const readWorkflows: Access = async (args): Promise<boolean | Where> => {
  const rule = await resolve(args);
  return rule === false ? false : both(rule.subjects, rule.visible);
};

/**
 * Who may read events: exactly who may read their run. The subject part applies to the events'
 * own subject columns; the host's `visibility.read` applies through the event's `run`
 * relationship, so an event follows its run without copying anything onto it.
 */
export const readWorkflowEvents: Access = async (args): Promise<boolean | Where> => {
  const rule = await resolve(args);
  if (rule === false) {
    return false;
  }
  const visible =
    typeof rule.visible === "object" ? throughPath(rule.visible, "run") : rule.visible;
  return both(rule.subjects, visible);
};
