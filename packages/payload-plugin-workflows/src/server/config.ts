import type { Payload, TypedUser } from "payload";

import { WorkflowError } from "../engine/errors.js";
import type { ResolvedWorkflows, WorkflowAccess, WorkflowAccessArgs } from "../options.js";
import type { Caller, UserActor, WorkflowDefinition } from "../types.js";

export const resolvedOf = (payload: Payload): ResolvedWorkflows => {
  const resolved = payload.config.custom?.workflows as ResolvedWorkflows | undefined;
  if (!resolved) {
    throw new Error("payload-plugin-workflows: workflowsPlugin() is not installed in this config.");
  }
  return resolved;
};

export const definitionOf = (resolved: ResolvedWorkflows, name: string): WorkflowDefinition => {
  const def = resolved.definitions.find((entry) => entry.name === name);
  if (!def) {
    throw new WorkflowError("unknown-workflow", `There is no workflow "${name}".`);
  }
  return def;
};

export const defaultRoles = (user: TypedUser): string[] => {
  const record = user as unknown as Record<string, unknown>;
  if (Array.isArray(record.roles)) {
    return record.roles.filter((role): role is string => typeof role === "string");
  }
  return typeof record.role === "string" && record.role ? [record.role] : [];
};

export type Via = UserActor["via"];

export const callerOf = (resolved: ResolvedWorkflows, user: TypedUser, via: Via): Caller => ({
  actor: { id: String(user.id), collection: user.collection, via },
  roles: resolved.roles(user),
});

/** Whether `user` belongs to the admin user collection (`admin.user`). */
export const isAdminUser = (payload: Payload, user: TypedUser): boolean =>
  user.collection === payload.config.admin?.user;

/**
 * An access check for `user` (never `req.user`). Without a check of its own: a user of the admin
 * user collection. Callers have already loaded the document with the user's access.
 */
export const allowedBy = async (
  check: WorkflowAccess | undefined,
  args: WorkflowAccessArgs
): Promise<boolean> =>
  check ? (await check(args)) === true : isAdminUser(args.req.payload, args.user);

/** Public functions act for a real user; `null` / missing is `unauthorized`. */
export const requireUser = (user: TypedUser | null | undefined): TypedUser => {
  if (!user) {
    throw new WorkflowError("unauthorized", "You must be logged in.");
  }
  return user;
};
