// The authoring vocabulary (Sanity's: workflow / stage / activity / action / transition / field /
// guard / effect) plus the instance state the engine works on. Pure types — no Payload imports.

export type UserActor = { id: string; collection: string; via: "admin" | "api" | "agent" };
/** The engine itself (cascade, hooks, tick, effects). `id` is declared so `actor.id` reads as optional. */
export type SystemActor = { system: true; id?: undefined; collection?: undefined; via?: undefined };
export type Actor = UserActor | SystemActor;

export type ActivityStatus = "active" | "done" | "skipped" | "failed";
export type ResolvedStatus = Exclude<ActivityStatus, "active">;

export type FieldType = "string" | "text" | "number" | "boolean" | "date" | "user" | "json";

export interface FieldDef {
  name: string;
  type: FieldType;
  title?: string;
  initialValue?: unknown;
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
  /** Resolves the firing activity. */
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

export interface ActivityDef {
  name: string;
  title?: string;
  description?: string;
  /** Existence, evaluated once at stage entry; `false` => `skipped`. */
  filter?: Condition;
  /** Name of a `user` field; when it holds a user only that user is assigned. */
  assignee?: string;
  roles?: string[];
  actions: ActionDef[];
}

export interface TransitionDef {
  name: string;
  title?: string;
  to: string;
  /** Defaults to `allActivitiesDone`. */
  when?: Condition;
}

export type GuardOperation = "publish" | "update" | "delete";

export interface GuardDef {
  name: string;
  title?: string;
  operations: GuardOperation[];
  unless?: Condition;
}

export interface StageDef {
  name: string;
  title?: string;
  description?: string;
  activities?: ActivityDef[];
  /** None => terminal: entering the stage completes the instance. */
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

// ---- Instance state -----------------------------------------------------------------------

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

export interface InstanceState {
  workflow: string;
  stage: string;
  status: InstanceStatus;
  fields: Record<string, unknown>;
  /** Current stage visit. */
  activities: Record<string, ActivityState>;
  /** `activity/action` auto actions already fired this stage visit. */
  fired: string[];
  history: HistoryEntry[];
  startedAt: string;
  completedAt?: string;
}

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

export interface Result {
  state: InstanceState;
  effects: QueuedEffect[];
}

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
  waitingOn: { users: string[]; roles: string[] };
  fields: Record<string, unknown>;
  history: HistoryEntry[];
  /**
   * Titles of the stages, activities, actions and params `history` names, keyed by `stage`,
   * `stage/activity`, `stage/activity/action` and `stage/activity/action/param`. Names without a
   * declared title are left out.
   */
  titles?: Record<string, string>;
  canAbort: boolean;
  subject?: { collection: string; id: string; title?: string };
  /**
   * Display names of the users this view names (waiting on, assignees, history actors), keyed by
   * user id. Filled by `getWorkflowState`; ids the caller may not read are left out.
   */
  userLabels?: Record<string, string>;
}
