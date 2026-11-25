// The agent way in. Five operations, defined once (`workflowTools`), each with a description, a
// zod input schema and what it runs as the user behind the agent; then two surfaces over them:
// AI-SDK tools (`workflowAgentTools`, for `payload-content-agent`'s `customTools`) and MCP tools
// (`workflowMcpTools`, for `@payloadcms/plugin-mcp`). Both record every step as `via: "agent"`
// and answer a refusal with `{ error, code }` instead of throwing.

import type { Payload, PayloadRequest, TypedUser } from "payload";
import { z } from "zod";

import { fireWorkflowAction, requireUser, startWorkflow } from "./server/operations.js";
import {
  getWorkflowState,
  listWorkflowDefinitions,
  listWorkflowInstances,
} from "./server/queries.js";

/** What a tool's answer is when it refused: readable, and `code` is the stable part. */
export interface ToolError {
  error: string;
  code?: string;
}

/** Who a tool acts for. `req`, when given, is the caller's request (MCP: the HTTP request). */
export interface WorkflowToolContext {
  payload: Payload;
  user: TypedUser | null | undefined;
  req?: PayloadRequest;
}

/** Tools never throw at the agent: a refusal comes back as `{ error }` it can read and act on. */
export const safely = async <T>(run: () => Promise<T> | T): Promise<T | ToolError> => {
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

const define = <S extends z.ZodObject, R>(
  description: string,
  inputSchema: S,
  run: (input: z.infer<S>, ctx: WorkflowToolContext) => Promise<R> | R
) => ({ description, inputSchema, run });

// Parameter names stay `collectionSlug` / `documentId` / `instanceId`: a client that sees a bare
// `collection` + `id` may take the tool for a document reader.
/** The five operations, keyed by tool name. Every one acts as `ctx.user`, with their permissions. */
export const workflowTools = {
  workflows_list_definitions: define(
    "List the editorial workflows configured in this CMS: their names, the collections they run on and their stages.",
    z.object({}),
    (_input, { payload }) => listWorkflowDefinitions(payload)
  ),
  workflows_list_instances: define(
    "List workflow runs. scope 'mine' returns runs waiting on the current user; 'all' returns every run. Filter by workflow name and status.",
    z.object({
      scope: z.enum(["mine", "all"]).default("mine"),
      workflow: z.string().optional(),
      status: z.enum(["active", "completed", "aborted"]).optional(),
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
    (input, { payload, user }) => listWorkflowInstances(payload, { ...input, user })
  ),
  workflows_get_state: define(
    "Get the workflow runs on one document: current stage, activities, the actions you may fire (with reasons when you may not and the params they take), holding guards and history. Also lists workflows that can be started on it.",
    z.object({ collectionSlug: z.string(), documentId: z.string() }),
    (input, { payload, user }) =>
      getWorkflowState(payload, {
        collection: input.collectionSlug,
        id: input.documentId,
        user,
        via: "agent",
      })
  ),
  workflows_start: define(
    "Start a workflow on a document. Fails if it is already running there. `fields` may only set the workflow's input fields (declared with `input: true`); any other field is refused with code invalid-patch.",
    z.object({
      workflow: z.string(),
      collectionSlug: z.string(),
      documentId: z.string(),
      fields: z.record(z.string(), z.unknown()).optional(),
    }),
    (input, { payload, user, req }) =>
      startWorkflow(payload, {
        workflow: input.workflow,
        collection: input.collectionSlug,
        id: input.documentId,
        fields: input.fields,
        // Never as the system: an agent without a user may not start anything.
        user: requireUser(user),
        req,
        via: "agent",
      })
  ),
  workflows_fire_action: define(
    "Fire an action in a workflow run, exactly as a person clicking its button. Use workflows_get_state first to see which actions are allowed and what params they need. Name the activity only when the current stage has several.",
    z.object({
      instanceId: z.string(),
      activity: z.string().optional(),
      action: z.string(),
      params: z.record(z.string(), z.unknown()).optional(),
    }),
    (input, { payload, user, req }) =>
      fireWorkflowAction(payload, { ...input, user, req, via: "agent" })
  ),
};

type WorkflowTools = typeof workflowTools;
export type WorkflowToolName = keyof WorkflowTools;
type InputOf<K extends WorkflowToolName> = z.infer<WorkflowTools[K]["inputSchema"]>;
type ResultOf<K extends WorkflowToolName> = Awaited<ReturnType<WorkflowTools[K]["run"]>>;

/** Runs one tool for `ctx`: the input is checked against its schema, a refusal is `{ error, code }`. */
export const runWorkflowTool = <K extends WorkflowToolName>(
  name: K,
  input: unknown,
  ctx: WorkflowToolContext
): Promise<ResultOf<K> | ToolError> =>
  safely(() => {
    const tool = workflowTools[name];
    const parsed = tool.inputSchema.safeParse(input ?? {});
    if (!parsed.success) {
      return {
        error: `Invalid input: ${parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
          .join("; ")}`,
        code: "invalid-params",
      };
    }
    return (tool.run as (input: unknown, ctx: WorkflowToolContext) => ResultOf<K>)(
      parsed.data,
      ctx
    );
  });

const NAMES = Object.keys(workflowTools) as WorkflowToolName[];

// ---- AI-SDK tools -------------------------------------------------------------------------------

export type WorkflowAgentTools = {
  [K in WorkflowToolName]: {
    description: string;
    inputSchema: WorkflowTools[K]["inputSchema"];
    execute: (input: InputOf<K>) => Promise<ResultOf<K> | ToolError>;
  };
};

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
}): WorkflowAgentTools =>
  Object.fromEntries(
    NAMES.map((name) => [
      name,
      {
        description: workflowTools[name].description,
        inputSchema: workflowTools[name].inputSchema,
        execute: (input: unknown) => runWorkflowTool(name, input, { payload, user }),
      },
    ])
  ) as WorkflowAgentTools;

// ---- MCP tools ----------------------------------------------------------------------------------

/** What an MCP tool call answers: the result (or `{ error, code }`) as JSON text. */
export interface WorkflowMcpResult {
  content: { type: "text"; text: string }[];
  /** Set on a refusal, so the client knows the call did not do what was asked. */
  isError?: boolean;
}

/** One entry of `mcpPlugin({ mcp: { tools } })` (`@payloadcms/plugin-mcp`'s custom tool shape). */
export interface WorkflowMcpTool {
  name: WorkflowToolName;
  description: string;
  /**
   * A zod raw shape, as the MCP plugin expects. Typed loosely on purpose: the MCP plugin types it
   * with its own zod 3, while the MCP SDK it hands the shape to takes zod 3 and zod 4 schemas, so
   * a zod 4 shape works but would not type-check against `mcpPlugin`'s options without a cast.
   */
  parameters: Record<string, any>;
  handler: (
    args: Record<string, unknown>,
    req: PayloadRequest,
    extra?: unknown
  ) => Promise<WorkflowMcpResult>;
}

const isToolError = (value: unknown): value is ToolError =>
  Boolean(value) && typeof value === "object" && typeof (value as ToolError).error === "string";

/**
 * The same five tools for `@payloadcms/plugin-mcp`:
 * `mcpPlugin({ mcp: { tools: [...workflowMcpTools()] } })`. A call acts as the user the MCP API
 * key belongs to (`req.user`, which the MCP plugin sets to the key's user in the admin user
 * collection), with that user's permissions, and is recorded as `via: "agent"`. Each tool can be
 * switched off per API key in the key's "Tools" settings, like any custom MCP tool.
 */
export const workflowMcpTools = (): WorkflowMcpTool[] =>
  NAMES.map((name) => ({
    name,
    description: workflowTools[name].description,
    parameters: workflowTools[name].inputSchema.shape,
    handler: async (args, req) => {
      const result = await runWorkflowTool(name, args, {
        payload: req.payload,
        user: req.user,
        req,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        ...(isToolError(result) ? { isError: true } : {}),
      };
    },
  }));
