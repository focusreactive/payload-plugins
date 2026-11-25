// `requiredToPublish`: every publish of a document a required workflow covers needs a run of it
// that completed in one of the approving stages it names and that no publish has used yet, and
// uses it. A run that ended in another terminal stage counts as none. The verdict is computed here once, for the
// hook that enforces it and for the state the drawer and agents read.

import type { CollectionSlug, PayloadRequest } from "payload";
import { APIError } from "payload";

import { RUNS_SLUG } from "../constants.js";
import { approvingStages } from "../define.js";
import { findStage, recordBypass, recordPublish } from "../engine/engine.js";
import { isWorkflowError } from "../engine/errors.js";
import type { WorkflowDefinition } from "../types.js";
import { settingsOf, titleIn, userRefOf, writerOf } from "./operations.js";
import { mutateRun, subjectWhere } from "./store.js";
import type { InstanceDoc, Subject } from "./store.js";

/** The workflows required before publishing a document of `collection`. */
export const requiredWorkflows = (req: PayloadRequest, collection: string): WorkflowDefinition[] =>
  settingsOf(req.payload).workflows.filter(
    (def) => approvingStages(def).length > 0 && def.collections.includes(collection)
  );

/** One required workflow, its latest run on the document, and why a publish is refused, if it is. */
export interface PublishCheck {
  workflow: WorkflowDefinition;
  run?: InstanceDoc;
  /** The refusal, in words; none when the latest run completed in an approving stage, unused. */
  refusal?: string;
}

/** Why a publish is refused given the workflow's latest run on the document; none: allowed. */
const refusalOf = (
  req: PayloadRequest,
  workflow: WorkflowDefinition,
  run: InstanceDoc | undefined
): string | undefined => {
  const title = titleIn(req, workflow.title, workflow.name);
  if (run?.status === "active") {
    return `Publishing requires a completed ${title}; it is in progress.`;
  }
  if (run?.status !== "completed") {
    // None yet, or the last one was stopped.
    return `Publishing requires a completed ${title}. Start it from the Workflow button.`;
  }
  if (!approvingStages(workflow).includes(run.stage)) {
    // Completed, but in an ending that does not approve (e.g. rejected): like a stopped one.
    const stage = findStage(workflow, run.stage);
    const ended = titleIn(req, stage?.title, run.stage);
    return `The ${title} ended without approval (${ended}). Publishing requires a new ${title}; start it from the Workflow button.`;
  }
  if (run.publishedAt) {
    return `This version was approved and published; changes need a new ${title}.`;
  }
  return undefined;
};

/** A refused publish, as the save's error (the admin shows its message). */
export const refusedPublish = (message: string | undefined): APIError =>
  new APIError(message ?? "Publishing is not allowed.", 403, null, true);

/**
 * Each required workflow's latest run on the document (one indexed read each, full access) and
 * whether it lets a publish through. A document not created yet (`id` undefined) has no runs.
 */
export const publishChecks = async (
  req: PayloadRequest,
  collection: string,
  id: string | number | undefined
): Promise<PublishCheck[]> => {
  const checks: PublishCheck[] = [];
  for (const workflow of requiredWorkflows(req, collection)) {
    let run: InstanceDoc | undefined;
    if (id !== undefined) {
      const subject: Subject = { collection, id: String(id) };
      const found = await req.payload.find({
        collection: RUNS_SLUG as CollectionSlug,
        where: { and: [subjectWhere(subject, false), { workflow: { equals: workflow.name } }] },
        sort: "-createdAt",
        limit: 1,
        pagination: false,
        depth: 0,
        overrideAccess: true,
        req,
      });
      run = found.docs[0] as unknown as InstanceDoc | undefined;
    }
    const refusal = refusalOf(req, workflow, run);
    checks.push({ workflow, ...(run ? { run } : {}), ...(refusal ? { refusal } : {}) });
  }
  return checks;
};

/**
 * A publish goes through: marks each required workflow's completed, unused run as used
 * (`publishedAt`, and a `published` event), in the save's transaction (`mutateRun`, tracked). With
 * the bypass flag, the runs that would have refused it record `guard-bypassed` instead. A run that
 * another publish used in the meantime refuses this one: the error says so.
 */
export const usePublish = async (
  req: PayloadRequest,
  checks: PublishCheck[],
  bypassed: boolean
): Promise<void> => {
  const now = new Date();
  const actor = writerOf(req.payload, req.user);
  const by = userRefOf(req.payload, req.user);
  const env = { doc: null, now, cause: { kind: "save" as const, ...(by ? { by } : {}) } };
  for (const check of checks) {
    const { run, workflow } = check;
    if (!run) {
      continue;
    }
    if (check.refusal) {
      // Only with the bypass flag: the trace of what it let through.
      await mutateRun(req, workflow, run, (state) =>
        recordBypass(state, { operation: "publish", guards: ["requiredToPublish"], actor }, env)
      );
      continue;
    }
    try {
      await mutateRun(req, workflow, run, (state) => recordPublish(state, { actor }, env));
    } catch (error) {
      if (bypassed || !isWorkflowError(error) || error.code !== "instance-not-active") {
        throw error;
      }
      // Another publish used it first.
      throw refusedPublish(refusalOf(req, workflow, { ...run, publishedAt: "used" }));
    }
  }
};
