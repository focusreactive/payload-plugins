import type { CollectionSlug, Payload, SelectType, TypedUser, Where } from "payload";

import { findStage } from "../engine/context.js";
import { WorkflowError } from "../engine/errors.js";
import type { InstanceState, InstanceView } from "../types.js";
import { allowedBy, callerOf, requireUser, resolvedOf } from "./config.js";
import type { Via } from "./config.js";
import { assertSubjectCollection, contextFor } from "./operations.js";
import { definitionForDoc, presentInstance, titleOf } from "./present.js";
import { SETTLE_SELECT, findInstances, subjectWhere } from "./store.js";
import type { InstanceDoc } from "./store.js";
import { loadSubject } from "./subject.js";

/**
 * Display names for user ids, in one query with the caller's access: the admin user collection's
 * `useAsTitle`, else its email. Ids the caller may not read, or that are gone, are left out.
 */
export const userLabelsFor = async (
  payload: Payload,
  ctx: Awaited<ReturnType<typeof contextFor>>,
  user: TypedUser,
  ids: Iterable<string>
): Promise<Record<string, string>> => {
  const wanted = [...new Set(ids)].filter(Boolean);
  const slug = payload.config.admin?.user as CollectionSlug | undefined;
  const collection = slug ? payload.collections[slug] : undefined;
  if (!slug || !collection || wanted.length === 0) {
    return {};
  }
  const field = collection.config.admin?.useAsTitle;
  const found = await payload
    .find({
      collection: slug,
      where: { id: { in: wanted } },
      depth: 0,
      limit: wanted.length,
      pagination: false,
      overrideAccess: false,
      user,
      req: ctx.req,
    })
    .catch(() => ({ docs: [] }));
  const labels: Record<string, string> = {};
  for (const doc of found.docs as Record<string, unknown>[]) {
    const value = [field && field !== "id" ? doc[field] : undefined, doc.email].find(
      (candidate) => typeof candidate === "string" && candidate.trim() !== ""
    );
    if (typeof value === "string") {
      labels[String(doc.id)] = value;
    }
  }
  return labels;
};

const pick = (labels: Record<string, string>, ids: Iterable<string>): Record<string, string> => {
  const picked: Record<string, string> = {};
  for (const id of ids) {
    const label = labels[id];
    if (label !== undefined) {
      picked[id] = label;
    }
  }
  return picked;
};

/** The user ids a view names: who it waits on, assignees and the people in its history. */
const userIdsOf = (view: InstanceView, usersSlug: string | undefined): string[] => [
  ...view.waitingOn.users,
  ...view.activities.flatMap((activity) => (activity.assignee ? [activity.assignee] : [])),
  ...view.history.flatMap((entry) =>
    entry.actor.id !== undefined && entry.actor.collection === usersSlug ? [entry.actor.id] : []
  ),
];

export interface WorkflowState {
  /** Runs on this document, newest first: active ones and finished ones. */
  instances: InstanceView[];
  /** Workflows for this collection that are not running and the caller may start. */
  available: { name: string; title: string; description?: string }[];
}

/**
 * Runs as `user` may read them: the instances collection's `read` access (default: a user of the
 * admin user collection). Refused reading is `not-allowed`.
 */
const readRuns = async (
  ctx: Awaited<ReturnType<typeof contextFor>>,
  user: TypedUser,
  args: { where: Where; sort: string; select?: SelectType }
): Promise<InstanceDoc[]> => {
  const found = await ctx.payload
    .find({
      collection: ctx.resolved.instancesSlug as CollectionSlug,
      where: args.where,
      depth: 0,
      limit: 0,
      pagination: false,
      sort: args.sort,
      overrideAccess: false,
      user,
      req: ctx.req,
      ...(args.select ? { select: args.select } : {}),
    })
    .catch((error: unknown) => {
      if ((error as { status?: number }).status === 403) {
        throw new WorkflowError("not-allowed", "You are not allowed to read workflow runs.");
      }
      throw error;
    });
  return found.docs as unknown as InstanceDoc[];
};

/** Everything the document panel needs, read with the caller's access. */
export const getWorkflowState = async (
  payload: Payload,
  args: { collection: string; id: string | number; user: TypedUser | null | undefined; via?: Via }
): Promise<WorkflowState> => {
  const user = requireUser(args.user);
  const ctx = await contextFor(payload, user);
  assertSubjectCollection(ctx, args.collection);
  const subject = { collection: args.collection, id: String(args.id) };
  const doc = await loadSubject(payload, subject, user, ctx.req);
  const docs = await readRuns(ctx, user, {
    where: subjectWhere(subject, false),
    sort: "-createdAt",
  });
  const caller = callerOf(ctx.resolved, user, args.via ?? "admin");
  const presented = await Promise.all(
    docs.map((entry) => presentInstance(ctx, entry, caller, doc, user))
  );
  const usersSlug = payload.config.admin?.user;
  const labels = await userLabelsFor(
    payload,
    ctx,
    user,
    presented.flatMap((view) => userIdsOf(view, usersSlug))
  );
  const instances = presented.map((view) => ({
    ...view,
    userLabels: pick(labels, userIdsOf(view, usersSlug)),
  }));
  const running = new Set(
    docs.filter((entry) => entry.status === "active").map((entry) => entry.workflow)
  );
  const available: WorkflowState["available"] = [];
  for (const def of ctx.resolved.definitions) {
    if (!def.collections.includes(args.collection) || running.has(def.name)) {
      continue;
    }
    if (
      await allowedBy(ctx.resolved.access.start, {
        req: ctx.req,
        user,
        workflow: def,
        ...subject,
        doc,
      })
    ) {
      available.push({
        name: def.name,
        title: def.title ?? def.name,
        ...(def.description ? { description: def.description } : {}),
      });
    }
  }
  return { instances, available };
};

export interface InstanceSummary {
  id: string;
  workflow: string;
  workflowTitle: string;
  status: InstanceState["status"];
  stuck?: "unknown-stage";
  stage: { name: string; title: string };
  subject: { collection: string; id: string; title?: string };
  waitingOn: { users: string[]; roles: string[] };
  /** Display names of the users in `waitingOn`, keyed by id; unreadable ids are left out. */
  userLabels?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ListArgs {
  scope: "mine" | "all";
  workflow?: string;
  status?: InstanceState["status"];
  page?: number;
  limit?: number;
  user: TypedUser | null | undefined;
}

/** Ids per `IN (…)` query when checking which subjects the caller may read. */
const SUBJECT_CHUNK = 200;

/**
 * Which subjects `user` may read (latest draft, the user's access), with their titles, keyed by
 * `collection:id`. One query per collection (per chunk of ids); a collection that is gone, or a
 * failing query, reads as nothing readable.
 */
const readableSubjects = async (
  payload: Payload,
  ctx: Awaited<ReturnType<typeof contextFor>>,
  user: TypedUser,
  docs: InstanceDoc[]
): Promise<Map<string, string | undefined>> => {
  const readable = new Map<string, string | undefined>();
  const byCollection = new Map<string, Set<string>>();
  for (const doc of docs) {
    const ids = byCollection.get(doc.subjectCollection) ?? new Set<string>();
    ids.add(doc.subjectId);
    byCollection.set(doc.subjectCollection, ids);
  }
  for (const [collection, idSet] of byCollection) {
    const config = payload.collections[collection as CollectionSlug]?.config;
    if (!config) {
      continue;
    }
    const field = config.admin?.useAsTitle;
    const select: SelectType = field && field !== "id" ? { [field]: true } : { id: true };
    const ids = [...idSet];
    for (let from = 0; from < ids.length; from += SUBJECT_CHUNK) {
      const chunk = ids.slice(from, from + SUBJECT_CHUNK);
      const found = await payload
        .find({
          collection: collection as CollectionSlug,
          where: { id: { in: chunk } },
          select,
          depth: 0,
          draft: true,
          limit: chunk.length,
          pagination: false,
          overrideAccess: false,
          user,
          req: ctx.req,
        })
        .catch(() => ({ docs: [] }));
      for (const subject of found.docs as Record<string, unknown>[]) {
        readable.set(`${collection}:${String(subject.id)}`, titleOf(ctx, collection, subject));
      }
    }
  }
  return readable;
};

/**
 * The inbox: runs waiting on the caller (`mine`) or every run (`all`), newest change first. Runs
 * whose document the caller cannot read are left out before paginating, so `totalDocs` and
 * `totalPages` count only what the caller can see: the matching runs are read as a slim list
 * (ids and subjects), filtered, and only the requested page is loaded whole.
 */
export const listWorkflowInstances = async (
  payload: Payload,
  args: ListArgs
): Promise<{ docs: InstanceSummary[]; totalDocs: number; page: number; totalPages: number }> => {
  const user = requireUser(args.user);
  const ctx = await contextFor(payload, user);
  const and: Where[] = [];
  if (args.workflow) {
    and.push({ workflow: { equals: args.workflow } });
  }
  if (args.status) {
    and.push({ status: { equals: args.status } });
  }
  if (args.scope === "mine") {
    const roles = ctx.resolved.roles(user);
    and.push({
      or: [
        { assignedUsers: { in: [String(user.id)] } },
        ...(roles.length > 0 ? [{ assignedRoles: { in: roles } }] : []),
      ],
    });
  }
  const page = Math.max(1, Math.floor(args.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(args.limit ?? 20)));
  const matching = await readRuns(ctx, user, {
    where: { and },
    sort: "-updatedAt",
    select: { subjectCollection: true, subjectId: true },
  });
  const readable = await readableSubjects(payload, ctx, user, matching);
  const visible = matching.filter((doc) =>
    readable.has(`${doc.subjectCollection}:${doc.subjectId}`)
  );
  const pageIds = visible.slice((page - 1) * limit, page * limit).map((doc) => doc.id);
  const loaded =
    pageIds.length === 0
      ? []
      : await findInstances(
          payload,
          ctx.resolved.instancesSlug,
          { id: { in: pageIds } },
          ctx.req,
          SETTLE_SELECT
        );
  const byId = new Map(loaded.map((doc) => [String(doc.id), doc]));
  const docs = pageIds.flatMap((id) => byId.get(String(id)) ?? []);
  const labels = await userLabelsFor(
    payload,
    ctx,
    user,
    docs.flatMap((doc) => doc.assignedUsers ?? [])
  );
  return {
    docs: docs.map((doc) => {
      const def = definitionForDoc(ctx, doc);
      const stage = findStage(def, doc.stage);
      const title = readable.get(`${doc.subjectCollection}:${doc.subjectId}`);
      return {
        id: String(doc.id),
        workflow: doc.workflow,
        workflowTitle: def.title ?? def.name,
        status: doc.status,
        ...(stage ? {} : { stuck: "unknown-stage" as const }),
        stage: { name: doc.stage, title: stage?.title ?? doc.stage },
        subject: {
          collection: doc.subjectCollection,
          id: doc.subjectId,
          ...(title === undefined ? {} : { title }),
        },
        waitingOn: { users: doc.assignedUsers ?? [], roles: doc.assignedRoles ?? [] },
        userLabels: pick(labels, doc.assignedUsers ?? []),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    }),
    totalDocs: visible.length,
    page,
    totalPages: Math.ceil(visible.length / limit),
  };
};

export interface DefinitionSummary {
  name: string;
  title: string;
  description?: string;
  collections: string[];
  stages: { name: string; title: string }[];
}

/** The configured workflows, for pickers and agents. */
export const listWorkflowDefinitions = (
  payload: Payload
): { definitions: DefinitionSummary[] } => ({
  definitions: resolvedOf(payload).definitions.map((def) => ({
    name: def.name,
    title: def.title ?? def.name,
    ...(def.description ? { description: def.description } : {}),
    collections: [...def.collections],
    stages: def.stages.map((stage) => ({ name: stage.name, title: stage.title ?? stage.name })),
  })),
});
