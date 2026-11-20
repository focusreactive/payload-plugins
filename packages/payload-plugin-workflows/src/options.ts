import type { CollectionConfig, Field, Payload, PayloadRequest, TypedUser } from "payload";

import type { WorkflowsTranslationsOption } from "./translations/en.js";
import type { InstanceView, Patch, QueuedEffect, WorkflowDefinition } from "./types.js";

export interface EffectHandlerArgs {
  payload: Payload;
  req: PayloadRequest;
  /** The run as the system sees it, with `id` and `subject`. */
  instance: InstanceView;
  /** The subject document (latest draft), or `null` when it is gone. */
  doc: Record<string, unknown> | null;
  effect: QueuedEffect;
}

/**
 * Runs after the change that queued it is committed, as a Payload job (retried on throw). Return
 * `{ set }` to write workflow fields and move the run — how an async step reports back.
 */
export type EffectHandler = (
  args: EffectHandlerArgs
) => Promise<void | { set?: Patch }> | void | { set?: Patch };

export interface WorkflowAccessArgs {
  req: PayloadRequest;
  /** Who is asking: the `user` passed to the operation, not necessarily `req.user`. */
  user: TypedUser;
  workflow: WorkflowDefinition;
  /** The subject document's collection and id. */
  collection: string;
  id: string;
  /** The subject document (latest draft), read with `user`'s access. */
  doc: Record<string, unknown> | null;
}

export type WorkflowAccess = (args: WorkflowAccessArgs) => boolean | Promise<boolean>;

export interface WorkflowsPluginOptions {
  /** Default `true`. */
  enabled?: boolean;
  workflows: WorkflowDefinition[];
  effects?: Record<string, EffectHandler>;
  /** Roles of a user. Default: `user.roles` (array) or `user.role` (string), else none. */
  roles?: (user: TypedUser) => string[];
  /**
   * Who may start a run, fire an action or abort a run. Only `true` allows. Default: a user of the
   * admin user collection (`admin.user`). The document is always read with the user's access
   * first, so someone who cannot read it is refused before these run.
   */
  access?: { start?: WorkflowAccess; fire?: WorkflowAccess; abort?: WorkflowAccess };
  /**
   * Schedule the `workflowTick` task (settles every active run with the current time; needed only
   * for `now`-based conditions). The host's `jobs.autoRun` must cover the `workflows` queue.
   */
  tick?: { cron: string };
  /** Default `"workflow-instances"`. */
  instancesSlug?: string;
  /** Instances collection overrides: `access` / `admin` / `hooks` merged, `fields` mapped. */
  overrides?: Partial<Pick<CollectionConfig, "access" | "admin" | "hooks">> & {
    fields?: (defaultFields: Field[]) => Field[];
  };
  /** Admin UI strings per locale, merged over the English defaults (`workflows` namespace). */
  translations?: WorkflowsTranslationsOption;
}

/** What the plugin stores on `config.custom.workflows` for the server functions. */
export interface ResolvedWorkflows {
  definitions: WorkflowDefinition[];
  effects: Record<string, EffectHandler>;
  roles: (user: TypedUser) => string[];
  access: { start?: WorkflowAccess; fire?: WorkflowAccess; abort?: WorkflowAccess };
  instancesSlug: string;
}
