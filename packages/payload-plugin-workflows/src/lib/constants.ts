export const PANEL_COMPONENT = "@focus-reactive/payload-plugin-workflows/client#WorkflowPanel";

/** A server component: renders the client view inside the admin's default template (nav + header). */
export const VIEW_COMPONENT = "@focus-reactive/payload-plugin-workflows/rsc#WorkflowsViewServer";

export const NAV_LINK_COMPONENT =
  "@focus-reactive/payload-plugin-workflows/client#WorkflowsNavLink";

export const DEFAULT_INSTANCES_SLUG = "workflow-instances";

/** Admin route of the workflows view, relative to the admin root. */
export const VIEW_PATH = "/workflows";

/** Name of the sidebar `ui` field injected into every subject collection. */
export const PANEL_FIELD = "workflowPanel";

export const ENDPOINT_PREFIX = "/workflows";

export const EFFECT_TASK = "workflowEffect";

export const TICK_TASK = "workflowTick";

export const JOBS_QUEUE = "workflows";

/** Retries of an effect job after its first failure. */
export const EFFECT_RETRIES = 2;

/** Max effect jobs one operation runs inline after its commit (effects that queue effects). */
export const INLINE_JOB_LIMIT = 20;

/** Active runs the tick reads per page. */
export const TICK_PAGE = 100;

/** Optimistic-lock attempts before an operation gives up with `conflict`. */
export const COMMIT_ATTEMPTS = 3;

/**
 * `req.context` key: when `true`, the plugin's guards let the write through. Lets an effect
 * handler publish as part of the workflow.
 */
export const WORKFLOW_BYPASS = "workflowBypass";

/** `req.context` key carrying the job ids queued during an inline run. Internal. */
export const QUEUED_JOBS = "workflowQueuedJobs";
