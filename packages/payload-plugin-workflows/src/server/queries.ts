// The reads: the runs on one document, the inbox, the configured workflows. Runs are read with the
// caller's access, and a run on a document the caller cannot read is never shown.

import type {
  CollectionSlug,
  Payload,
  PayloadRequest,
  SelectType,
  TypedUser,
  Where,
} from "payload";

import { RUNS_SLUG } from "../constants.js";
import { findStage } from "../engine/engine.js";
import { WorkflowError } from "../engine/errors.js";
import type { InstanceState, InstanceView } from "../types.js";
import {
  allowedBy,
  assertSubjectCollection,
  definitionOrStandIn,
  loadSubject,
  presentRun,
  requestFor,
  requireUser,
  settingsOf,
  titleOf,
} from "./operations.js";
import { subjectWhere } from "./store.js";
import type { InstanceDoc } from "./store.js";

/** Runs as `user` may read them (the runs collection's `read` access); refused is `not-allowed`. */
const readRuns = async (
  req: PayloadRequest,
  user: TypedUser,
  args: { where: Where; sort: string; select?: SelectType }
): Promise<InstanceDoc[]> => {
  const found = await req.payload
    .find({
      collection: RUNS_SLUG as CollectionSlug,
      where: args.where,
      depth: 0,
      limit: 0,
      pagination: false,
      sort: args.sort,
      overrideAccess: false,
      user,
      req,
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

export interface WorkflowState {
  /** Runs on this document, newest first: active ones and finished ones. */
  instances: InstanceView[];
  /** Workflows for this collection that are not running and the caller may start. */
  available: {
    name: string;
    title: string;
    description?: string;
    /** Its stages in order, so the drawer can show what starting it leads to. */
    stages: { name: string; title: string }[];
  }[];
}

/** The runs on one document and what the caller may start there. */
export const getWorkflowState = async (
  payload: Payload,
  args: { collection: string; id: string | number; user: TypedUser | null | undefined }
): Promise<WorkflowState> => {
  const user = requireUser(args.user);
  const req = await requestFor(payload, user);
  assertSubjectCollection(payload, args.collection);
  const subject = { collection: args.collection, id: String(args.id) };
  const doc = await loadSubject(req, subject, user);
  const docs = await readRuns(req, user, {
    where: subjectWhere(subject, false),
    sort: "-createdAt",
  });
  const instances = await Promise.all(docs.map((entry) => presentRun(req, entry, doc, user)));
  const running = new Set(
    docs.filter((entry) => entry.status === "active").map((entry) => entry.workflow)
  );
  const settings = settingsOf(payload);
  const available: WorkflowState["available"] = [];
  for (const def of settings.workflows) {
    if (!def.collections.includes(args.collection) || running.has(def.name)) {
      continue;
    }
    if (await allowedBy(settings.access.start, { req, user, workflow: def, ...subject, doc })) {
      available.push({
        name: def.name,
        title: def.title ?? def.name,
        ...(def.description ? { description: def.description } : {}),
        stages: def.stages.map((stage) => ({ name: stage.name, title: stage.title ?? stage.name })),
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
  /** It waits on the caller by name or by one of their roles (not merely open to anyone). */
  waitsOnYou: boolean;
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

/** The columns a summary needs: everything but the run's state and history. */
const SUMMARY_SELECT: SelectType = {
  workflow: true,
  subjectCollection: true,
  subjectId: true,
  stage: true,
  status: true,
  assignedUsers: true,
  assignedRoles: true,
  createdAt: true,
  updatedAt: true,
};

const keyOf = (doc: Pick<InstanceDoc, "subjectCollection" | "subjectId">) =>
  `${doc.subjectCollection}:${doc.subjectId}`;

/** Ids per `IN (…)` query when checking which documents the caller may read. */
const SUBJECT_CHUNK = 200;

/**
 * The documents of `docs` that `user` may read (latest draft, the user's access), with their
 * titles, keyed by `collection:id`. One query per collection and chunk of ids; a collection that
 * is gone, or a failing query, reads as nothing readable.
 */
const readableSubjects = async (
  req: PayloadRequest,
  user: TypedUser,
  docs: InstanceDoc[]
): Promise<Map<string, string | undefined>> => {
  const readable = new Map<string, string | undefined>();
  const byCollection = new Map<string, Set<string>>();
  for (const doc of docs) {
    const ids = byCollection.get(doc.subjectCollection) ?? new Set<string>();
    byCollection.set(doc.subjectCollection, ids.add(doc.subjectId));
  }
  for (const [collection, idSet] of byCollection) {
    const config = req.payload.collections[collection as CollectionSlug]?.config;
    if (!config) {
      continue;
    }
    const field = config.admin?.useAsTitle;
    const select: SelectType = field && field !== "id" ? { [field]: true } : { id: true };
    const ids = [...idSet];
    for (let from = 0; from < ids.length; from += SUBJECT_CHUNK) {
      const chunk = ids.slice(from, from + SUBJECT_CHUNK);
      const found = await req.payload
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
          req,
        })
        .catch(() => ({ docs: [] }));
      for (const subject of found.docs as Record<string, unknown>[]) {
        const key = keyOf({ subjectCollection: collection, subjectId: String(subject.id) });
        readable.set(key, titleOf(req.payload, collection, subject));
      }
    }
  }
  return readable;
};

/**
 * The inbox: runs the caller can pick up (`mine`: waiting on them or one of their roles, then
 * active runs open to anyone) or every run (`all`), newest change first. The
 * matching runs are read as summaries, those whose document the caller cannot read are dropped,
 * and then the page is cut, so `totalDocs` and `totalPages` count only what the caller can see.
 */
export const listWorkflowInstances = async (
  payload: Payload,
  args: ListArgs
): Promise<{ docs: InstanceSummary[]; totalDocs: number; page: number; totalPages: number }> => {
  const user = requireUser(args.user);
  const req = await requestFor(payload, user);
  const and: Where[] = [];
  if (args.workflow) {
    and.push({ workflow: { equals: args.workflow } });
  }
  if (args.status) {
    and.push({ status: { equals: args.status } });
  }
  const me = String(user.id);
  const roles = settingsOf(payload).roles(user);
  if (args.scope === "mine") {
    and.push({
      or: [
        { assignedUsers: { in: [me] } },
        ...(roles.length > 0 ? [{ assignedRoles: { in: roles } }] : []),
        // Open to anyone: an active run that waits on no user and no role.
        {
          and: [
            { status: { equals: "active" } },
            { assignedUsers: { exists: false } },
            { assignedRoles: { exists: false } },
          ],
        },
      ],
    });
  }
  const page = Math.max(1, Math.floor(args.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(args.limit ?? 20)));
  const matching = await readRuns(req, user, {
    where: { and },
    sort: "-updatedAt",
    select: SUMMARY_SELECT,
  });
  const readable = await readableSubjects(req, user, matching);
  const waitsOnYou = (doc: InstanceDoc) =>
    (doc.assignedUsers ?? []).includes(me) ||
    (doc.assignedRoles ?? []).some((role) => roles.includes(role));
  const visible = matching.filter(
    (doc) =>
      readable.has(keyOf(doc)) &&
      // A stuck run waits on nobody, but nobody can pick it up either.
      (args.scope === "all" ||
        waitsOnYou(doc) ||
        findStage(definitionOrStandIn(payload, doc), doc.stage))
  );
  if (args.scope === "mine") {
    // What waits on the caller specifically first, then what is open to anyone (stable sort).
    visible.sort((a, b) => Number(waitsOnYou(b)) - Number(waitsOnYou(a)));
  }
  const docs = visible.slice((page - 1) * limit, page * limit).map((doc): InstanceSummary => {
    const def = definitionOrStandIn(payload, doc);
    const stage = findStage(def, doc.stage);
    const title = readable.get(keyOf(doc));
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
      waitsOnYou: waitsOnYou(doc),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  });
  return { docs, totalDocs: visible.length, page, totalPages: Math.ceil(visible.length / limit) };
};

export interface DefinitionSummary {
  name: string;
  title: string;
  description?: string;
  collections: string[];
  /** In order; `final` stages have no transitions: entering one completes the run. */
  stages: { name: string; title: string; final: boolean }[];
}

/** The configured workflows, for the dashboard widget and agents. */
export const listWorkflowDefinitions = (
  payload: Payload
): { definitions: DefinitionSummary[] } => ({
  definitions: settingsOf(payload).workflows.map((def) => ({
    name: def.name,
    title: def.title ?? def.name,
    ...(def.description ? { description: def.description } : {}),
    collections: [...def.collections],
    stages: def.stages.map((stage) => ({
      name: stage.name,
      title: stage.title ?? stage.name,
      final: (stage.transitions ?? []).length === 0,
    })),
  })),
});
