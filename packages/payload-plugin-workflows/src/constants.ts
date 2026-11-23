// Names shared by the server and the admin components. No imports: safe in the client bundle.

/** Where runs live. */
export const RUNS_SLUG = "workflow-instances";

/** The plugin's REST endpoints, relative to the API route. */
export const ENDPOINTS = {
  state: "/workflows/state",
  start: "/workflows/start",
  fire: "/workflows/fire",
  abort: "/workflows/abort",
  instances: "/workflows/instances",
  definitions: "/workflows/definitions",
} as const;

/** The workflows view, relative to the admin route. */
export const VIEW_PATH = "/workflows";

export const JOBS_QUEUE = "workflows";
export const EFFECT_TASK = "workflowEffect";
export const TICK_TASK = "workflowTick";

/**
 * `req.context` key: when `true`, the plugin's guards let the write through. Lets an effect
 * handler publish as part of the workflow.
 */
export const WORKFLOW_BYPASS = "workflowBypass";

/** `req.context` key carrying the job ids queued during an inline effect run. Internal. */
export const QUEUED_JOBS = "workflowQueuedJobs";
