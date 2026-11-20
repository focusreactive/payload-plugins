import type {
  ActivityDef,
  Caller,
  CallerActionDef,
  Env,
  InstanceState,
  StageDef,
  ViewActionReason,
} from "../types.js";
import { callerContext, evaluate, statusOf } from "./context.js";
import type { WorkflowErrorCode } from "./errors.js";

export type Verdict =
  | { allowed: true }
  | {
      allowed: false;
      code: Extract<
        WorkflowErrorCode,
        "instance-not-active" | "activity-not-active" | "not-allowed"
      >;
      reason: string;
      reasonCode: Exclude<ViewActionReason, "error">;
    };

const list = (values: string[]) => values.map((value) => `"${value}"`).join(", ");

/**
 * May this caller fire this caller action right now? The one verdict both `fire` and `view`
 * use, so a button shown enabled never fails for a reason the UI could have known.
 */
export const verdictFor = (
  state: InstanceState,
  stage: StageDef | undefined,
  activity: ActivityDef,
  action: CallerActionDef,
  caller: Caller,
  env: Env
): Verdict => {
  if (state.status !== "active") {
    return {
      allowed: false,
      code: "instance-not-active",
      reason: `The workflow is ${state.status}.`,
      reasonCode: "not-active",
    };
  }
  const status = statusOf(state, activity.name);
  if (status !== "active") {
    return {
      allowed: false,
      code: "activity-not-active",
      reason: `"${activity.title ?? activity.name}" is already ${status}.`,
      reasonCode: "not-active",
    };
  }
  const ctx = callerContext(state, env, stage, activity, caller);
  if (!ctx.assigned) {
    const held = activity.assignee ? state.fields[activity.assignee] : undefined;
    return {
      allowed: false,
      code: "not-allowed",
      reason:
        typeof held === "string" && held
          ? "This is assigned to someone else."
          : `Requires one of the roles ${list(activity.roles ?? [])}.`,
      reasonCode: "assignment",
    };
  }
  if (
    action.roles &&
    action.roles.length > 0 &&
    !action.roles.some((role) => ctx.roles.includes(role))
  ) {
    return {
      allowed: false,
      code: "not-allowed",
      reason: `Requires one of the roles ${list(action.roles)}.`,
      reasonCode: "roles",
    };
  }
  if (action.filter) {
    const label = `activity "${activity.name}" action "${action.name}" filter`;
    if (!evaluate(label, action.filter, ctx)) {
      return {
        allowed: false,
        code: "not-allowed",
        reason: "Not available right now.",
        reasonCode: "filter",
      };
    }
  }
  return { allowed: true };
};
