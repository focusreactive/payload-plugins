import { defineWorkflow } from "../define.js";
import type {
  Caller,
  Cause,
  Env,
  InstanceState,
  InstanceView,
  KnownWorkflowEvent,
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
  actor: { id: who.user ?? "user", via: "api" },
  roles: who.roles ?? [],
});

/**
 * An in-memory run over the same engine functions the server uses, for testing a definition's
 * every path before an editor sees it. Each step returns the new state; the history is kept in
 * memory (`events`), as the server keeps it in the events collection.
 */
export const createWorkflowSimulator = (
  definition: WorkflowDefinition,
  options: { fields?: Patch; doc?: Record<string, unknown> | null; now?: Date } = {}
) => {
  const def = defineWorkflow(definition);
  const env: Env = { doc: options.doc ?? null, now: options.now ?? new Date() };
  const effects: QueuedEffect[] = [];
  const events: KnownWorkflowEvent[] = [];
  let state: InstanceState;
  const apply = (result: Result): InstanceState => {
    state = result.state;
    effects.push(...result.effects);
    events.push(...result.events);
    return state;
  };
  const as = (cause: Cause): Env => ({ ...env, cause });
  apply(start(def, { fields: options.fields, actor: SYSTEM }, as({ kind: "start" })));

  return {
    get state(): InstanceState {
      return state;
    },
    /** The whole history so far, oldest first. */
    get events(): KnownWorkflowEvent[] {
      return [...events];
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
        fire(
          def,
          state,
          { activity: who.activity, action, params: who.params },
          callerOf(who),
          as({ kind: "step" })
        )
      ),
    /** Replaces the subject document and settles, as saving it would. */
    setDoc: (doc: Record<string, unknown> | null) => {
      env.doc = doc;
      return apply(settle(def, state, as({ kind: "save" })));
    },
    /** Moves the clock and settles, as the tick does. */
    advance: (date: Date) => {
      env.now = date;
      return apply(settle(def, state, as({ kind: "tick" })));
    },
    /** An effect (`effect`, default "simulated") reporting fields back. */
    patch: (values: Patch, effect = "simulated") =>
      apply(patchFields(def, state, values, as({ kind: "effect", effect }))),
    /** Stops the run, as `who` (default: the system). */
    abort: (reason?: string, who?: SimulatedCaller) =>
      apply(abort(state, { reason, actor: who ? callerOf(who).actor : SYSTEM }, env)),
    /** The run as `who` sees it, with the most recent history, in `language` (default English). */
    view: (who?: SimulatedCaller, language?: string): InstanceView =>
      view(def, state, callerOf(who), env, { events, language }),
  };
};
