import type { Endpoint, PayloadRequest, TypedUser } from "payload";

import { isWorkflowError } from "./engine/errors.js";
import type { WorkflowErrorCode } from "./engine/errors.js";
import { ENDPOINT_PREFIX } from "./lib/constants.js";
import type { Via } from "./server/config.js";
import { abortWorkflow, fireWorkflowAction, startWorkflow } from "./server/operations.js";
import {
  getWorkflowState,
  listWorkflowDefinitions,
  listWorkflowInstances,
} from "./server/queries.js";
import type { InstanceState } from "./types.js";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const fail = (message: string, status: number) => json({ errors: [{ message }] }, status);

const STATUS: Partial<Record<WorkflowErrorCode, number>> = {
  unauthorized: 401,
  "not-allowed": 403,
  conflict: 409,
  "already-running": 409,
  "instance-not-active": 409,
  "activity-not-active": 409,
  "not-callable": 409,
  "unknown-workflow": 404,
  "unknown-instance": 404,
  "unknown-subject": 404,
  "unknown-stage": 404,
  "unknown-activity": 404,
  "unknown-action": 404,
  "invalid-params": 400,
  // Caller-supplied start fields; a definition whose `set` writes a wrong type also lands here.
  "invalid-patch": 400,
};

export const statusOf = (code: WorkflowErrorCode): number => STATUS[code] ?? 500;

const readBody = async (req: PayloadRequest): Promise<Record<string, unknown>> => {
  const body = typeof req.json === "function" ? await req.json().catch(() => null) : null;
  return body && typeof body === "object" && !Array.isArray(body) ? body : {};
};

const queryOf = (req: PayloadRequest) => new URL(req.url || "", "http://internal").searchParams;

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value
    ? value
    : typeof value === "number"
      ? String(value)
      : undefined;

const record = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

// An API key is a script; any other session is someone in the admin.
const viaOf = (user: TypedUser): Via =>
  (user as { _strategy?: string })._strategy === "api-key" ? "api" : "admin";

const missing = (names: string[]) => fail(`Missing ${names.join(", ")}.`, 400);

type Handler = (req: PayloadRequest, user: TypedUser) => Promise<unknown>;

/** Thin: authenticate, parse, call the server function, map its errors. */
const handle =
  (run: Handler) =>
  async (req: PayloadRequest): Promise<Response> => {
    if (!req.user) {
      return fail("You must be logged in.", 401);
    }
    try {
      const body = await run(req, req.user);
      return body instanceof Response ? body : json(body);
    } catch (error) {
      if (isWorkflowError(error)) {
        const status = statusOf(error.code);
        if (status === 500) {
          req.payload.logger.error({ err: error, msg: "workflows request failed" });
        }
        return json({ errors: [{ message: error.message, code: error.code }] }, status);
      }
      const status = (error as { status?: number }).status;
      if (status && status >= 400 && status < 500) {
        return fail((error as Error).message, status);
      }
      req.payload.logger.error({ err: error, msg: "workflows request failed" });
      return fail("Something went wrong running the workflow.", 500);
    }
  };

const STATUSES: InstanceState["status"][] = ["active", "completed", "aborted"];

export const workflowEndpoints = (): Endpoint[] => [
  {
    path: `${ENDPOINT_PREFIX}/state`,
    method: "get",
    handler: handle(async (req, user) => {
      const query = queryOf(req);
      const collection = query.get("collection");
      const id = query.get("id");
      if (!collection || !id) {
        return missing(["collection", "id"]);
      }
      return getWorkflowState(req.payload, { collection, id, user, via: viaOf(user) });
    }),
  },
  {
    path: `${ENDPOINT_PREFIX}/start`,
    method: "post",
    handler: handle(async (req, user) => {
      const body = await readBody(req);
      const workflow = str(body.workflow);
      const collection = str(body.collection);
      const id = str(body.id);
      if (!workflow || !collection || !id) {
        return missing(["workflow", "collection", "id"]);
      }
      return startWorkflow(req.payload, {
        workflow,
        collection,
        id,
        fields: record(body.fields),
        user,
        req,
        via: viaOf(user),
      });
    }),
  },
  {
    path: `${ENDPOINT_PREFIX}/fire`,
    method: "post",
    handler: handle(async (req, user) => {
      const body = await readBody(req);
      const instanceId = str(body.instanceId);
      const activity = str(body.activity);
      const action = str(body.action);
      if (!instanceId || !activity || !action) {
        return missing(["instanceId", "activity", "action"]);
      }
      return fireWorkflowAction(req.payload, {
        instanceId,
        activity,
        action,
        params: record(body.params),
        user,
        req,
        via: viaOf(user),
      });
    }),
  },
  {
    path: `${ENDPOINT_PREFIX}/abort`,
    method: "post",
    handler: handle(async (req, user) => {
      const body = await readBody(req);
      const instanceId = str(body.instanceId);
      if (!instanceId) {
        return missing(["instanceId"]);
      }
      return abortWorkflow(req.payload, {
        instanceId,
        reason: str(body.reason),
        user,
        req,
        via: viaOf(user),
      });
    }),
  },
  {
    path: `${ENDPOINT_PREFIX}/instances`,
    method: "get",
    handler: handle(async (req, user) => {
      const query = queryOf(req);
      const status = query.get("status");
      const page = Number(query.get("page") ?? 1);
      const limit = Number(query.get("limit") ?? 20);
      return listWorkflowInstances(req.payload, {
        scope: query.get("scope") === "all" ? "all" : "mine",
        workflow: query.get("workflow") || undefined,
        status: STATUSES.find((entry) => entry === status),
        page: Number.isFinite(page) ? page : 1,
        limit: Number.isFinite(limit) ? limit : 20,
        user,
      });
    }),
  },
  {
    path: `${ENDPOINT_PREFIX}/definitions`,
    method: "get",
    handler: handle(async (req) => listWorkflowDefinitions(req.payload)),
  },
];
