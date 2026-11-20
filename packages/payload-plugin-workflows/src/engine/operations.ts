import type {
  Actor,
  Caller,
  CallerActionDef,
  Env,
  InstanceState,
  Patch,
  Result,
  WorkflowDefinition,
} from "../types.js";
import { activitiesOf, callerContext, evaluate, findStage, isAuto } from "./context.js";
import { WorkflowError } from "./errors.js";
import { validateParams } from "./params.js";
import { settle } from "./settle.js";
import { applyAction, applyPatch, enterStage } from "./steps.js";
import { verdictFor } from "./verdict.js";

const assertActive = (state: InstanceState) => {
  if (state.status !== "active") {
    throw new WorkflowError("instance-not-active", `The workflow is ${state.status}.`);
  }
};

/** Settles after a change; a cascade that ends where it began still returns the changed state. */
const settleAfter = (def: WorkflowDefinition, changed: Result, env: Env): Result => {
  const settled = settle(def, changed.state, env);
  return { state: settled.state, effects: [...changed.effects, ...settled.effects] };
};

/** Creates an instance, enters the initial stage and settles. */
export const start = (
  def: WorkflowDefinition,
  input: { fields?: Patch; actor: Actor },
  env: Env
): Result => {
  const initial: Record<string, unknown> = {};
  for (const field of def.fields ?? []) {
    if (field.initialValue !== undefined && field.initialValue !== null) {
      initial[field.name] = field.initialValue;
    }
  }
  let fields = initial;
  if (input.fields) {
    const notInput = Object.keys(input.fields).filter(
      (key) => !(def.fields ?? []).some((field) => field.name === key && field.input === true)
    );
    if (notInput.length > 0) {
      throw new WorkflowError(
        "invalid-patch",
        `start fields: ${notInput.map((key) => `"${key}"`).join(", ")} cannot be supplied when starting; only fields declared with \`input: true\` can.`
      );
    }
    fields = applyPatch(def, initial, input.fields, "start fields");
  }
  const stage = findStage(def, def.initialStage);
  if (!stage) {
    throw new WorkflowError(
      "unknown-stage",
      `Initial stage "${def.initialStage}" is not declared.`
    );
  }
  const at = env.now.toISOString();
  const created: InstanceState = {
    workflow: def.name,
    stage: stage.name,
    status: "active",
    fields,
    activities: {},
    fired: [],
    history: [{ at, actor: input.actor, type: "started", stage: stage.name }],
    startedAt: at,
  };
  return settleAfter(def, { state: enterStage(created, stage, env), effects: [] }, env);
};

/** A caller fires an action. Rejections are typed, in the order documented in the spec. */
export const fire = (
  def: WorkflowDefinition,
  state: InstanceState,
  input: { activity: string; action: string; params?: Record<string, unknown> },
  caller: Caller,
  env: Env
): Result => {
  assertActive(state);
  const stage = findStage(def, state.stage);
  if (!stage) {
    throw new WorkflowError(
      "unknown-stage",
      `Stage "${state.stage}" no longer exists in workflow "${def.name}"; the run can only be aborted.`
    );
  }
  const activity = activitiesOf(stage).find((entry) => entry.name === input.activity);
  if (!activity) {
    throw new WorkflowError(
      "unknown-activity",
      `Stage "${stage.name}" has no activity "${input.activity}".`
    );
  }
  const action = activity.actions.find((entry) => entry.name === input.action);
  if (!action) {
    throw new WorkflowError(
      "unknown-action",
      `Activity "${activity.name}" has no action "${input.action}".`
    );
  }
  if (isAuto(action)) {
    throw new WorkflowError(
      "not-callable",
      `Action "${action.name}" fires automatically and cannot be called.`
    );
  }
  const callable = action as CallerActionDef;
  const verdict = verdictFor(state, stage, activity, callable, caller, env);
  if (!verdict.allowed) {
    throw new WorkflowError(verdict.code, verdict.reason);
  }
  const params = validateParams(callable.params, input.params);
  const patch =
    typeof callable.set === "function"
      ? evaluate(`activity "${activity.name}" action "${action.name}" set`, callable.set, {
          ...callerContext(state, env, stage, activity, caller),
          params,
        })
      : callable.set;
  const fired = applyAction(
    def,
    state,
    { activity: activity.name, action, actor: caller.actor, patch, params },
    env
  );
  return settleAfter(def, fired, env);
};

/** Writes fields from outside a caller action (an effect reporting back), then settles. */
export const patchFields = (
  def: WorkflowDefinition,
  state: InstanceState,
  patch: Patch,
  env: Env
): Result => {
  assertActive(state);
  const fields = applyPatch(def, state.fields, patch, "patchFields");
  return settleAfter(def, { state: { ...state, fields }, effects: [] }, env);
};

/** Ends an active run. Needs no stage, so a stuck run can always be aborted. */
export const abort = (
  _def: WorkflowDefinition | undefined,
  state: InstanceState,
  input: { reason?: string; actor: Actor },
  env: Env
): Result => {
  assertActive(state);
  const at = env.now.toISOString();
  return {
    state: {
      ...state,
      status: "aborted",
      completedAt: at,
      history: [
        ...state.history,
        {
          at,
          actor: input.actor,
          type: "aborted",
          ...(input.reason ? { reason: input.reason } : {}),
        },
      ],
    },
    effects: [],
  };
};
