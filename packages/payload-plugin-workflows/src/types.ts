// The vocabulary: a workflow is a list of stages; a stage has actions (grouped in activities when
// it has several parallel tasks) and transitions; a document's run holds the current stage, the
// run's fields and its history. Types only: the engine that works on them never touches Payload.

export type UserActor = { id: string; collection: string; via: "admin" | "api" | "agent" };
/** The engine itself (cascade, hooks, tick, effects). `id` is declared so `actor.id` reads as optional. */
export type SystemActor = { system: true; id?: undefined; collection?: undefined; via?: undefined };
export type Actor = UserActor | SystemActor;

export type ActivityStatus = "active" | "done" | "skipped" | "failed";
export type ResolvedStatus = Exclude<ActivityStatus, "active">;

export type FieldType = "string" | "text" | "number" | "boolean" | "date" | "user" | "json";

/** What a field's `initialValue` function sees when a run starts. */
export interface StartContext {
  /** Who starts the run: a person or agent, or the system (auto-start). */
  actor: Actor;
  /** The subject document (latest draft), or `null`. */
  doc: Record<string, unknown> | null;
}

export interface FieldDef {
  name: string;
  type: FieldType;
  title?: string;
  /**
   * The value a run starts with, type-checked like any write. A function gets the start context,
   * e.g. `({ actor }) => actor.id` to hold whoever started the run.
   */
  initialValue?:
    | string
    | number
    | boolean
    | Record<string, unknown>
    | unknown[]
    | ((ctx: StartContext) => unknown);
  /** `true` lets a caller supply this field when starting a run (`startWorkflow({ fields })`). */
  input?: boolean;
}

export type ParamType = "string" | "text" | "number" | "boolean" | "date" | "select";

export interface ParamDef {
  name: string;
  type: ParamType;
  title?: string;
  description?: string;
  required?: boolean;
  /** Choices of a `select` param. */
  options?: (string | { label: string; value: string })[];
}

/** What every condition sees. Caller-blind on purpose: the cascade runs for nobody in particular. */
export interface ConditionContext {
  fields: Record<string, unknown>;
  activities: Record<string, ActivityStatus>;
  allActivitiesDone: boolean;
  anyActivityFailed: boolean;
  /** The subject document (latest draft), or `null` when it is gone. */
  doc: Record<string, unknown> | null;
  now: Date;
  stage: string;
}

export type Condition = (ctx: ConditionContext) => boolean;

export interface CallerContext extends ConditionContext {
  actor: UserActor;
  roles: string[];
  assigned: boolean;
}

export type CallerCondition = (ctx: CallerContext) => boolean;

/**
 * What `set` sees. For an automatic action the actor is the system, `roles` is empty, `assigned`
 * is `true` and `params` is empty.
 */
export interface ActionContext extends Omit<CallerContext, "actor"> {
  actor: Actor;
  params: Record<string, unknown>;
}

/** Field values to write; `null` / `undefined` unsets. */
export type Patch = Record<string, unknown>;

interface ActionBase {
  name: string;
  title?: string;
  description?: string;
  /** Resolves the action's activity (for a stage with plain `actions`: the stage's task). */
  status?: ResolvedStatus;
  /** Names of effect handlers registered in the plugin options. */
  effects?: string[];
}

/** Fired by a caller (person or agent). */
export interface CallerActionDef extends ActionBase {
  when?: undefined;
  set?: Patch | ((ctx: ActionContext) => Patch);
  params?: ParamDef[];
  filter?: CallerCondition;
  roles?: string[];
}

/** Fired by the engine as soon as `when` is true, at most once per stage visit. Never callable. */
export interface AutoActionDef extends ActionBase {
  when: Condition;
  set?: Patch | ((ctx: ActionContext) => Patch);
  params?: undefined;
  filter?: undefined;
  roles?: undefined;
}

export type ActionDef = CallerActionDef | AutoActionDef;

/** Who may act on a task: a held `user` field shadows the role pool; neither means everyone. */
interface Assignment {
  /** Name of a `user` field; when it holds a user only that user is assigned. */
  assignee?: string;
  roles?: string[];
}

/** One of several parallel tasks in a stage. */
export interface ActivityDef extends Assignment {
  name: string;
  title?: string;
  description?: string;
  /** Existence, evaluated once at stage entry; `false` => `skipped`. */
  filter?: Condition;
  actions: ActionDef[];
}

export interface TransitionDef {
  name: string;
  title?: string;
  to: string;
  /** Defaults to "every activity is done or skipped". */
  when?: Condition;
}

export type GuardOperation = "publish" | "update" | "delete";

export interface GuardDef {
  name: string;
  title?: string;
  operations: GuardOperation[];
  unless?: Condition;
}

/**
 * A stage declares its task either as plain `actions` (with `assignee` / `roles`), or, when it has
 * several parallel tasks, as `activities`, never both. `defineWorkflow` turns plain `actions` into
 * one activity named after the stage, so the engine only ever sees `activities`.
 */
export interface StageDef extends Assignment {
  name: string;
  title?: string;
  description?: string;
  actions?: ActionDef[];
  activities?: ActivityDef[];
  /** None => terminal: entering the stage completes the run. */
  transitions?: TransitionDef[];
  guards?: GuardDef[];
}

export type StartMode =
  | "manual"
  | "onCreate"
  | { on: "create"; when: (args: { doc: Record<string, unknown> }) => boolean };

export interface WorkflowDefinition {
  name: string;
  title?: string;
  description?: string;
  collections: string[];
  start?: StartMode;
  initialStage: string;
  fields?: FieldDef[];
  stages: StageDef[];
}

// ---- A run ----------------------------------------------------------------------------------

export interface ActivityState {
  status: ActivityStatus;
  at?: string;
  by?: Actor;
}

export type HistoryEntry = { at: string; actor: Actor } & (
  | { type: "started"; stage: string }
  | {
      type: "action";
      stage: string;
      activity: string;
      action: string;
      auto: boolean;
      params?: Record<string, unknown>;
    }
  | { type: "transition"; from: string; to: string; transition: string }
  | { type: "effect"; effect: string; status: "queued" | "done" | "failed"; error?: string }
  | { type: "completed" }
  | { type: "aborted"; reason?: string }
);

export type InstanceStatus = "active" | "completed" | "aborted";

/** A run: the current stage, the run's fields and its history. */
export interface InstanceState {
  workflow: string;
  stage: string;
  status: InstanceStatus;
  fields: Record<string, unknown>;
  /** Statuses of the current stage's activities, this visit. */
  activities: Record<string, ActivityState>;
  /** `activity/action` auto actions already fired this stage visit. */
  fired: string[];
  history: HistoryEntry[];
  startedAt: string;
  completedAt?: string;
}

/** What conditions read besides the run: the document and the clock. */
export interface Env {
  doc: Record<string, unknown> | null;
  now: Date;
}

export interface Caller {
  actor: UserActor;
  roles: string[];
}

export interface QueuedEffect {
  name: string;
  activity: string;
  action: string;
}

/** What every engine operation returns: the new state and the effects it queued. */
export interface Result {
  state: InstanceState;
  effects: QueuedEffect[];
}

// ---- The view: what the drawer and agents render --------------------------------------------

export interface ViewAction {
  name: string;
  title: string;
  description?: string;
  allowed: boolean;
  reason?: string;
  /**
   * Why it is not allowed, machine-readable: `filter` (the action's own `filter` is false right
   * now), `assignment` (assigned to someone else, or the activity's roles), `roles` (the action's
   * roles), `not-active` (run or activity no longer active), `error` (a condition threw).
   */
  reasonCode?: ViewActionReason;
  params: ParamDef[];
}

export type ViewActionReason = "filter" | "assignment" | "roles" | "not-active" | "error";

export interface ViewActivity {
  name: string;
  title: string;
  description?: string;
  status: ActivityStatus;
  assignee?: string;
  roles?: string[];
  actions: ViewAction[];
}

/** The projection the admin UI and agents render. Nothing in it is callable. */
export interface InstanceView {
  id?: string;
  workflow: string;
  title: string;
  status: InstanceStatus;
  stuck?: "unknown-stage";
  stage: { name: string; title: string; description?: string };
  stages: { name: string; title: string; state: "past" | "current" | "upcoming" }[];
  activities: ViewActivity[];
  guards: { name: string; title: string; operations: string[] }[];
  /** User ids and roles the run waits on. */
  waitingOn: { users: string[]; roles: string[] };
  fields: Record<string, unknown>;
  history: HistoryEntry[];
  /**
   * The definition's titles, so the history can name what it records even after the run left the
   * stage. Keyed by `stage`, `stage/activity`, `stage/activity/action` and
   * `stage/activity/action/param`; names without a declared title are left out.
   */
  titles: Record<string, string>;
  canAbort: boolean;
  subject?: { collection: string; id: string; title?: string };
}
