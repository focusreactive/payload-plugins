// Names shared by the server and the admin components. No imports: safe in the client bundle.

/** Where runs live. */
export const RUNS_SLUG = "workflow-instances";

/**
 * The plugin's REST endpoints, relative to the API route. They live on the runs collection
 * (collection endpoints), so the plugin owns the namespace and no host collection can shadow them.
 */
export const ENDPOINTS = {
  state: `/${RUNS_SLUG}/state`,
  history: `/${RUNS_SLUG}/history`,
  start: `/${RUNS_SLUG}/start`,
  fire: `/${RUNS_SLUG}/fire`,
  abort: `/${RUNS_SLUG}/abort`,
} as const;

/** An admin component's import-map path: `client` for client components, `rsc` for server ones. */
export const componentPath = (entry: "client" | "rsc", name: string): string =>
  `@focus-reactive/payload-plugin-workflows/${entry}#${name}`;

/** The dashboard widget's slug (`admin.dashboard.widgets`). */
export const WIDGET_SLUG = "workflows-plugin";

/** The jobs queue effects run on, and the plugin's two job tasks. */
export const JOBS_QUEUE = "workflows-plugin";
export const EFFECT_TASK = "workflowsPluginEffect";
export const TICK_TASK = "workflowsPluginTick";

/**
 * `req.context` key: when `true`, the plugin's guards let the write through. Lets an effect
 * handler publish as part of the workflow.
 */
export const WORKFLOW_BYPASS = "workflowBypass";

/** `req.context` key carrying the job ids queued during an inline effect run. Internal. */
export const QUEUED_JOBS = "workflowQueuedJobs";

/** `req.context` key caching the runs collection's read constraint per user. Internal. */
export const READ_CACHE = "workflowReadRuns";
