import type { Payload, TypedUser } from "payload";
import { z } from "zod";

import { fireWorkflowAction, requireUser, startWorkflow } from "./server/operations.js";
import {
  getWorkflowState,
  listWorkflowDefinitions,
  listWorkflowInstances,
} from "./server/queries.js";

/** Tools never throw at the agent: a refusal comes back as `{ error }` it can read and act on. */
const safely = async <T>(
  run: () => Promise<T> | T
): Promise<T | { error: string; code?: string }> => {
  try {
    return await run();
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    return {
      error: error instanceof Error ? error.message : String(error),
      ...(typeof code === "string" ? { code } : {}),
    };
  }
};

const tool = <S extends z.ZodType, R>(
  description: string,
  inputSchema: S,
  execute: (input: z.infer<S>) => Promise<R> | R
) => ({
  description,
  inputSchema,
  execute: (input: z.infer<S>) => safely(() => execute(input)),
});

/**
 * AI-SDK-shaped tools (`{ description, inputSchema, execute }`) that move workflows as `user`,
 * with that user's permissions; the history records them as an agent. Drop-in for a content
 * agent: `customTools: (ctx) => workflowAgentTools(ctx)`.
 */
export const workflowAgentTools = ({
  payload,
  user,
}: {
  payload: Payload;
  user: TypedUser | null | undefined;
}) => ({
  workflows_list_definitions: tool(
    "List the editorial workflows configured in this CMS: their names, the collections they run on and their stages.",
    z.object({}),
    () => listWorkflowDefinitions(payload)
  ),
  workflows_list_instances: tool(
    "List workflow runs. scope 'mine' returns runs waiting on the current user; 'all' returns every run. Filter by workflow name and status.",
    z.object({
      scope: z.enum(["mine", "all"]).default("mine"),
      workflow: z.string().optional(),
      status: z.enum(["active", "completed", "aborted"]).optional(),
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
    (input) => listWorkflowInstances(payload, { ...input, user })
  ),
  workflows_get_state: tool(
    "Get the workflow runs on one document: current stage, activities, the actions you may fire (with reasons when you may not and the params they take), holding guards and history. Also lists workflows that can be started on it.",
    z.object({ collectionSlug: z.string(), documentId: z.string() }),
    (input) =>
      getWorkflowState(payload, {
        collection: input.collectionSlug,
        id: input.documentId,
        user,
      })
  ),
  workflows_start: tool(
    "Start a workflow on a document. Fails if it is already running there. `fields` may only set the workflow's input fields (declared with `input: true`); any other field is refused with code invalid-patch.",
    z.object({
      workflow: z.string(),
      collectionSlug: z.string(),
      documentId: z.string(),
      fields: z.record(z.string(), z.unknown()).optional(),
    }),
    (input) =>
      startWorkflow(payload, {
        workflow: input.workflow,
        collection: input.collectionSlug,
        id: input.documentId,
        fields: input.fields,
        // Never as the system: an agent without a user may not start anything.
        user: requireUser(user),
        via: "agent",
      })
  ),
  workflows_fire_action: tool(
    "Fire an action in a workflow run, exactly as a person clicking its button. Use workflows_get_state first to see which actions are allowed and what params they need. Name the activity only when the current stage has several.",
    z.object({
      instanceId: z.string(),
      activity: z.string().optional(),
      action: z.string(),
      params: z.record(z.string(), z.unknown()).optional(),
    }),
    (input) => fireWorkflowAction(payload, { ...input, user, via: "agent" })
  ),
});
