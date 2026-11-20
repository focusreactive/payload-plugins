import { randomUUID } from "node:crypto";

import type { CollectionSlug, Payload, PayloadRequest, SelectType, Where } from "payload";

import { WorkflowError } from "../engine/errors.js";
import { waitingOnOf } from "../engine/view.js";
import type { InstanceState, WorkflowDefinition } from "../types.js";

/** A row of the instances collection, as the plugin reads it. */
export interface InstanceDoc {
  id: string | number;
  workflow: string;
  subjectCollection: string;
  subjectId: string;
  stage: string;
  status: InstanceState["status"];
  fields?: Record<string, unknown> | null;
  activities?: InstanceState["activities"] | null;
  fired?: string[] | null;
  history?: InstanceState["history"] | null;
  assignedUsers?: string[] | null;
  assignedRoles?: string[] | null;
  revision: number;
  activeKey: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  collection: string;
  id: string;
}

export const activeKeyOf = (workflow: string, subject: Subject): string =>
  `${workflow}:${subject.collection}:${subject.id}`;

export const toState = (doc: InstanceDoc): InstanceState => ({
  workflow: doc.workflow,
  stage: doc.stage,
  status: doc.status,
  fields: doc.fields ?? {},
  activities: doc.activities ?? {},
  fired: doc.fired ?? [],
  history: doc.history ?? [],
  startedAt: doc.createdAt,
  ...(doc.completedAt ? { completedAt: doc.completedAt } : {}),
});

/** The columns written for a state. `waitingOn` is denormalised so the inbox is one query. */
export const toData = (
  state: InstanceState,
  def: WorkflowDefinition | undefined,
  subject: Subject
) => {
  const waiting = def ? waitingOnOf(def, state) : { users: [], roles: [] };
  return {
    workflow: state.workflow,
    subjectCollection: subject.collection,
    subjectId: subject.id,
    stage: state.stage,
    status: state.status,
    fields: state.fields,
    activities: state.activities,
    fired: state.fired,
    history: state.history,
    assignedUsers: waiting.users,
    assignedRoles: waiting.roles,
    // Unique: one active run of a workflow per document, enforced by the database.
    activeKey:
      state.status === "active" ? activeKeyOf(state.workflow, subject) : `done:${randomUUID()}`,
    completedAt: state.completedAt ?? null,
  };
};

export const subjectOf = (doc: InstanceDoc): Subject => ({
  collection: doc.subjectCollection,
  id: doc.subjectId,
});

export const loadInstance = async (
  payload: Payload,
  slug: string,
  id: string | number,
  req?: PayloadRequest
): Promise<InstanceDoc> => {
  const doc = await payload.findByID({
    collection: slug as CollectionSlug,
    id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    ...(req ? { req } : {}),
  });
  if (!doc) {
    throw new WorkflowError("unknown-instance", `There is no workflow run "${id}".`);
  }
  return doc as unknown as InstanceDoc;
};

/** Everything but the audit trail: enough to evaluate guards and to decide whether a run moves. */
export const SETTLE_SELECT: SelectType = { history: false };

export const findInstances = async (
  payload: Payload,
  slug: string,
  where: Where,
  req?: PayloadRequest,
  select?: SelectType
): Promise<InstanceDoc[]> => {
  const result = await payload.find({
    collection: slug as CollectionSlug,
    where,
    depth: 0,
    limit: 0,
    pagination: false,
    sort: "-createdAt",
    overrideAccess: true,
    ...(req ? { req } : {}),
    ...(select ? { select } : {}),
  });
  return result.docs as unknown as InstanceDoc[];
};

export const subjectWhere = (subject: Subject, activeOnly: boolean): Where => ({
  and: [
    { subjectCollection: { equals: subject.collection } },
    { subjectId: { equals: subject.id } },
    ...(activeOnly ? [{ status: { equals: "active" } }] : []),
  ],
});
