import type {
  Caller,
  Env,
  InstanceState,
  InstanceView,
  Patch,
  QueuedEffect,
  WorkflowDefinition,
} from "../types.js";
import { assertValidDefinition } from "../validate.js";
import { abort, fire, patchFields, start } from "./operations.js";
import { settle } from "./settle.js";
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
 * every path before an editor sees it.
 */
export const createWorkflowSimulator = (
  def: WorkflowDefinition,
  options: { fields?: Patch; doc?: Record<string, unknown> | null; now?: Date } = {}
) => {
  assertValidDefinition(def);
  const env: Env = { doc: options.doc ?? null, now: options.now ?? new Date() };
  const effects: QueuedEffect[] = [];
  const first = start(def, { fields: options.fields, actor: { system: true } }, env);
  let state: InstanceState = first.state;
  effects.push(...first.effects);

  // Each step answers with the new state.
  const apply = (result: { state: InstanceState; effects: QueuedEffect[] }): InstanceState => {
    state = result.state;
    effects.push(...result.effects);
    return state;
  };

  return {
    get state(): InstanceState {
      return state;
    },
    /** Every effect queued so far, in order. */
    get effects(): QueuedEffect[] {
      return [...effects];
    },
    fire: (
      activity: string,
      action: string,
      who: SimulatedCaller & { params?: Record<string, unknown> } = {}
    ) => apply(fire(def, state, { activity, action, params: who.params }, callerOf(who), env)),
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
    abort: (reason?: string) => apply(abort(def, state, { reason, actor: { system: true } }, env)),
    view: (who?: SimulatedCaller): InstanceView => view(def, state, callerOf(who), env),
  };
};
