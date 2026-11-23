import { defineWorkflow } from "../define.js";
import type {
  Caller,
  Env,
  InstanceState,
  InstanceView,
  Patch,
  QueuedEffect,
  Result,
  WorkflowDefinition,
} from "../types.js";
import { SYSTEM, abort, fire, patchFields, settle, start } from "./engine.js";
import { view } from "./view.js";

export interface SimulatedCaller {
  /** User id; defaults to `"user"`. */
  user?: string;
  roles?: string[];
}

const callerOf = (who: SimulatedCaller = {}): Caller => ({
  actor: { id: who.user ?? "user", collection: "users", via: "api" },
  roles: who.roles ?? [],
});

/**
 * An in-memory run over the same engine functions the server uses, for testing a definition's
 * every path before an editor sees it. Each step returns the new state.
 */
export const createWorkflowSimulator = (
  definition: WorkflowDefinition,
  options: { fields?: Patch; doc?: Record<string, unknown> | null; now?: Date } = {}
) => {
  const def = defineWorkflow(definition);
  const env: Env = { doc: options.doc ?? null, now: options.now ?? new Date() };
  const effects: QueuedEffect[] = [];
  let state: InstanceState;
  const apply = (result: Result): InstanceState => {
    state = result.state;
    effects.push(...result.effects);
    return state;
  };
  apply(start(def, { fields: options.fields, actor: SYSTEM }, env));

  return {
    get state(): InstanceState {
      return state;
    },
    /** Every effect queued so far, in order. */
    get effects(): QueuedEffect[] {
      return [...effects];
    },
    /** Fires an action, as a person or agent would; `activity` only when the stage has several. */
    fire: (
      action: string,
      who: SimulatedCaller & { activity?: string; params?: Record<string, unknown> } = {}
    ) =>
      apply(
        fire(def, state, { activity: who.activity, action, params: who.params }, callerOf(who), env)
      ),
    /** Replaces the subject document and settles, as saving it would. */
    setDoc: (doc: Record<string, unknown> | null) => {
      env.doc = doc;
      return apply(settle(def, state, env));
    },
    /** Moves the clock and settles, as the tick does. */
    advance: (date: Date) => {
      env.now = date;
      return apply(settle(def, state, env));
    },
    /** An effect reporting back. */
    patch: (values: Patch) => apply(patchFields(def, state, values, env)),
    abort: (reason?: string) => apply(abort(state, { reason, actor: SYSTEM }, env)),
    view: (who?: SimulatedCaller): InstanceView => view(def, state, callerOf(who), env),
  };
};
