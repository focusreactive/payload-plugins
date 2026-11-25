// The reads: the runs on one document, a run's older history, the inbox, the widget's boards, the
// configured workflows. Runs are read with the caller's access: the runs collection's own `read`
// access (`readRuns` in store.ts) keeps out runs on documents the caller cannot read, in the
// database query itself, so pages, counts and totals are the database's.

import type {
  CollectionSlug,
  Payload,
  PayloadRequest,
  SelectType,
  TypedUser,
  Where,
} from "payload";

import { decodeAssignees, roleToken, userToken } from "../assignees.js";
import { RUNS_SLUG } from "../constants.js";
import { findStage } from "../engine/engine.js";
import { WorkflowError } from "../engine/errors.js";
import { HISTORY_IN_VIEW } from "../engine/view.js";
import type {
  HistoryEntry,
  InstanceState,
  InstanceView,
  UserActor,
  WorkflowDefinition,
} from "../types.js";
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
import { hiddenCollectionsOf, subjectWhere } from "./store.js";
import type { InstanceDoc } from "./store.js";

/** A refusal of the runs collection's `read` access is `not-allowed`. */
const refused = (error: unknown): never => {
  if ((error as { status?: number }).status === 403) {
    throw new WorkflowError("not-allowed", "You are not allowed to read workflow runs.");
  }
  throw error;
};

/** The columns a summary needs: everything but the run's state and history. */
const SUMMARY_SELECT: SelectType = {
  workflow: true,
  subjectCollection: true,
  subjectId: true,
  stage: true,
  status: true,
  assignees: true,
  createdAt: true,
  updatedAt: true,
};

/** One page of runs as `user` may read them, without a count (`pagination: false`). */
const readRuns = async (
  req: PayloadRequest,
  user: TypedUser,
  args: { where: Where; sort: string; page?: number; limit: number; select?: SelectType }
): Promise<InstanceDoc[]> => {
  const found = await req.payload
    .find({
      collection: RUNS_SLUG as CollectionSlug,
      where: args.where,
      depth: 0,
      limit: args.limit,
      page: args.page ?? 1,
      pagination: false,
      sort: args.sort,
      overrideAccess: false,
      user,
      req,
      ...(args.select ? { select: args.select } : {}),
    })
    .catch(refused);
  return found.docs as unknown as InstanceDoc[];
};

/** How many runs `user` may read match `where`. */
const countRuns = async (req: PayloadRequest, user: TypedUser, where: Where): Promise<number> =>
  (
    await req.payload
      .count({
        collection: RUNS_SLUG as CollectionSlug,
        where,
        overrideAccess: false,
        user,
        req,
      })
      .catch(refused)
  ).totalDocs;

/** Rows `[offset, offset + count)` of `where`, newest change first: at most two page reads. */
const runsAt = async (
  req: PayloadRequest,
  user: TypedUser,
  where: Where,
  offset: number,
  count: number
): Promise<InstanceDoc[]> => {
  const args = { where, sort: "-updatedAt", limit: count, select: SUMMARY_SELECT };
  const page = Math.floor(offset / count) + 1;
  const skip = offset % count;
  const rows = (await readRuns(req, user, { ...args, page })).slice(skip);
  if (skip > 0 && rows.length === count - skip) {
    rows.push(...(await readRuns(req, user, { ...args, page: page + 1 })).slice(0, skip));
  }
  return rows;
};

/** Subject collections whose runs are hidden from the caller, to say so (`READABLE_IDS_CAP`). */
const hiddenOf = (req: PayloadRequest, only?: string): { hiddenCollections?: string[] } => {
  const hidden = hiddenCollectionsOf(req).filter((slug) => only === undefined || slug === only);
  return hidden.length > 0 ? { hiddenCollections: hidden } : {};
};

export interface WorkflowState {
  /** The active runs on this document and the latest finished one, newest first. */
  instances: InstanceView[];
  /** Workflows for this collection that are not running and the caller may start. */
  available: {
    name: string;
    title: string;
    description?: string;
    /** Its stages in order, so the drawer can show what starting it leads to. */
    stages: { name: string; title: string }[];
  }[];
  /**
   * Set when runs on this document's collection are hidden from the caller because their read
   * access allows more documents than the plugin resolves (`READABLE_IDS_CAP`).
   */
  hiddenCollections?: string[];
}

/** The runs on one document (the active ones and the latest finished) and what may be started. */
export const getWorkflowState = async (
  payload: Payload,
  args: {
    collection: string;
    id: string | number;
    user: TypedUser | null | undefined;
    /** How the caller comes in; an agent sees steps reserved for a person as not allowed. */
    via?: UserActor["via"];
    /** The caller's request (headers, cookies, locale), for access rules that read it. */
    req?: PayloadRequest;
  }
): Promise<WorkflowState> => {
  const user = requireUser(args.user);
  const req = await requestFor(payload, user, args.req);
  assertSubjectCollection(payload, args.collection);
  const subject = { collection: args.collection, id: String(args.id) };
  const doc = await loadSubject(req, subject, user);
  const active = await readRuns(req, user, {
    where: subjectWhere(subject, true),
    sort: "-createdAt",
    limit: 100,
  });
  const [finished] = await readRuns(req, user, {
    where: { and: [subjectWhere(subject, false), { status: { not_equals: "active" } }] },
    sort: "-createdAt",
    limit: 1,
  });
  const docs = [...active, ...(finished ? [finished] : [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  const instances = await Promise.all(
    docs.map((entry) => presentRun(req, entry, doc, user, args.via))
  );
  const running = new Set(active.map((entry) => entry.workflow));
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
  return { instances, available, ...hiddenOf(req, args.collection) };
};

/**
 * Older history of a run the caller may read: the `limit` entries before index `before` (oldest
 * first; `before` defaults to the end), and how many are older still. A view carries the most
 * recent entries and `olderHistory`, their count: pass that as `before` for the page before it.
 */
export const getWorkflowHistory = async (
  payload: Payload,
  args: {
    instanceId: string | number;
    before?: number;
    limit?: number;
    user: TypedUser | null | undefined;
    req?: PayloadRequest;
  }
): Promise<{ entries: HistoryEntry[]; older: number }> => {
  const user = requireUser(args.user);
  const req = await requestFor(payload, user, args.req);
  const [run] = await readRuns(req, user, {
    where: { id: { equals: args.instanceId } },
    sort: "id",
    limit: 1,
    select: { history: true },
  });
  if (!run) {
    throw new WorkflowError("unknown-instance", `There is no workflow run "${args.instanceId}".`);
  }
  const history = run.history ?? [];
  const before = Math.min(history.length, Math.max(0, Math.floor(args.before ?? history.length)));
  const limit = Math.min(200, Math.max(1, Math.floor(args.limit ?? HISTORY_IN_VIEW)));
  const from = Math.max(0, before - limit);
  return { entries: history.slice(from, before), older: from };
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
  /** The caller's request (headers, cookies, locale), for access rules that read it. */
  req?: PayloadRequest;
}

export interface InstanceList {
  docs: InstanceSummary[];
  totalDocs: number;
  page: number;
  totalPages: number;
  /** Set when runs are hidden from the caller because of a very large read access set. */
  hiddenCollections?: string[];
}

/** Runs whose stage is still in their workflow's definition: a stuck run can be picked up by nobody. */
const inKnownStage = (workflows: WorkflowDefinition[]): Where => ({
  or: [
    ...workflows.map(
      (def): Where => ({
        and: [
          { workflow: { equals: def.name } },
          { stage: { in: def.stages.map((stage) => stage.name) } },
        ],
      })
    ),
    // Nothing configured: a condition nothing matches.
    ...(workflows.length === 0 ? [{ id: { exists: false } }] : []),
  ],
});

/**
 * Summaries of one page of runs, with their documents' titles: one query per collection on the
 * page, as the caller (latest draft). The runs are already readable (the runs collection's access);
 * a document not found here (deleted, trashed) is shown without a title.
 */
const summarize = async (
  req: PayloadRequest,
  user: TypedUser,
  docs: InstanceDoc[],
  waitsOnYou: (doc: InstanceDoc) => boolean
): Promise<InstanceSummary[]> => {
  const titles = new Map<string, string | undefined>();
  const byCollection = new Map<string, Set<string>>();
  for (const doc of docs) {
    const ids = byCollection.get(doc.subjectCollection) ?? new Set<string>();
    byCollection.set(doc.subjectCollection, ids.add(doc.subjectId));
  }
  for (const [collection, ids] of byCollection) {
    const field = req.payload.collections[collection as CollectionSlug]?.config.admin?.useAsTitle;
    if (!field || field === "id") {
      continue;
    }
    const found = await req.payload
      .find({
        collection: collection as CollectionSlug,
        where: { id: { in: [...ids] } },
        select: { [field]: true },
        depth: 0,
        draft: true,
        limit: ids.size,
        pagination: false,
        overrideAccess: false,
        user,
        req,
      })
      .catch(() => ({ docs: [] }));
    for (const subject of found.docs as Record<string, unknown>[]) {
      titles.set(`${collection}:${String(subject.id)}`, titleOf(req.payload, collection, subject));
    }
  }
  return docs.map((doc): InstanceSummary => {
    const def = definitionOrStandIn(req.payload, doc);
    const stage = findStage(def, doc.stage);
    const title = titles.get(`${doc.subjectCollection}:${doc.subjectId}`);
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
      waitingOn: decodeAssignees(doc.assignees),
      waitsOnYou: waitsOnYou(doc),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  });
};

/**
 * The inbox: runs the caller can pick up (`mine`: those waiting on them or one of their roles,
 * then active runs open to anyone) or every run (`all`), newest change first. Paginated, sorted
 * and counted in the database, with the caller's read access: `totalDocs` counts only runs on
 * documents the caller may read, and a deep page costs what the first one does. `mine` is two
 * queries ("waiting on you", "open to anyone"), each counted, read only where the page falls.
 */
export const listWorkflowInstances = async (
  payload: Payload,
  args: ListArgs
): Promise<InstanceList> => {
  const user = requireUser(args.user);
  const req = await requestFor(payload, user, args.req);
  const settings = settingsOf(payload);
  const filters: Where[] = [];
  if (args.workflow) {
    filters.push({ workflow: { equals: args.workflow } });
  }
  if (args.status) {
    filters.push({ status: { equals: args.status } });
  }
  const me = String(user.id);
  const roles = settings.roles(user);
  const waitsOnYou = (doc: InstanceDoc) => {
    const waiting = decodeAssignees(doc.assignees);
    return waiting.users.includes(me) || waiting.roles.some((role) => roles.includes(role));
  };
  const page = Math.max(1, Math.floor(args.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(args.limit ?? 20)));
  const offset = (page - 1) * limit;
  let docs: InstanceDoc[];
  let totalDocs: number;
  if (args.scope === "all") {
    const where: Where = { and: filters };
    totalDocs = await countRuns(req, user, where);
    docs = offset < totalDocs ? await runsAt(req, user, where, offset, limit) : [];
  } else {
    // Only an active run waits on anyone (`assignees` is empty otherwise).
    const active: Where[] = [...filters, { status: { equals: "active" } }];
    const waiting: Where = {
      and: [
        ...active,
        {
          or: [
            { assignees: { contains: userToken(me) } },
            ...roles.map((role) => ({ assignees: { contains: roleToken(role) } })),
          ],
        },
      ],
    };
    // Open to anyone: waits on no user and no role, in a stage its workflow still has.
    const open: Where = {
      and: [...active, { assignees: { exists: false } }, inKnownStage(settings.workflows)],
    };
    const first = await countRuns(req, user, waiting);
    const second = await countRuns(req, user, open);
    totalDocs = first + second;
    docs = offset < first ? await runsAt(req, user, waiting, offset, limit) : [];
    const rest = limit - docs.length;
    if (rest > 0 && offset + docs.length < totalDocs) {
      docs.push(...(await runsAt(req, user, open, Math.max(0, offset - first), rest)));
    }
  }
  return {
    docs: await summarize(req, user, docs, waitsOnYou),
    totalDocs,
    page,
    totalPages: Math.ceil(totalDocs / limit),
    ...hiddenOf(req),
  };
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

export interface BoardColumn {
  key: string;
  title: string;
  /** Open runs in this column the caller may see. */
  count: number;
  /** The most recently changed of them. */
  runs: InstanceSummary[];
}

export interface Board {
  workflow: DefinitionSummary;
  columns: BoardColumn[];
}

/**
 * The dashboard widget's boards: for the first `boards` workflows (in configured order) with open
 * runs the caller may see, one column per stage that can hold them (and a "stuck" one when runs
 * sit in a stage the workflow no longer has), each counted in the database with its newest
 * `cards` runs. `unshown` counts the open runs of the workflows left out.
 */
export const workflowBoards = async (
  payload: Payload,
  args: {
    user: TypedUser | null | undefined;
    req?: PayloadRequest;
    boards: number;
    cards: number;
    stuckTitle: string;
  }
): Promise<{ boards: Board[]; unshown: number; hiddenCollections?: string[] }> => {
  const user = requireUser(args.user);
  const req = await requestFor(payload, user, args.req);
  const active: Where = { status: { equals: "active" } };
  const columns: { column: BoardColumn; docs: InstanceDoc[] }[] = [];
  const boards: Board[] = [];
  let unshown = 0;
  for (const def of listWorkflowDefinitions(payload).definitions) {
    const ofWorkflow: Where[] = [active, { workflow: { equals: def.name } }];
    const total = await countRuns(req, user, { and: ofWorkflow });
    if (total === 0) {
      continue;
    }
    if (boards.length >= args.boards) {
      unshown += total;
      continue;
    }
    const board: Board = { workflow: def, columns: [] };
    const known = def.stages.map((stage) => stage.name);
    const stages = [
      ...def.stages
        .filter((stage) => !stage.final)
        .map((stage) => ({ key: stage.name, title: stage.title, stage: { equals: stage.name } })),
      { key: "__stuck", title: args.stuckTitle, stage: { not_in: known } },
    ];
    for (const stage of stages) {
      const where: Where = { and: [...ofWorkflow, { stage: stage.stage }] };
      const count = await countRuns(req, user, where);
      if (count === 0 && stage.key === "__stuck") {
        continue;
      }
      const docs = count > 0 ? await runsAt(req, user, where, 0, args.cards) : [];
      const column: BoardColumn = { key: stage.key, title: stage.title, count, runs: [] };
      board.columns.push(column);
      columns.push({ column, docs });
    }
    boards.push(board);
  }
  // One title lookup for every card on every board.
  const all = columns.flatMap((entry) => entry.docs);
  const summaries = new Map(
    (await summarize(req, user, all, () => false)).map((summary) => [summary.id, summary])
  );
  for (const { column, docs } of columns) {
    column.runs = docs.flatMap((doc) => summaries.get(String(doc.id)) ?? []);
  }
  return { boards, unshown, ...hiddenOf(req) };
};
