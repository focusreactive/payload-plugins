// The vocabulary: a workflow is a list of stages; a stage has actions (grouped in activities when
// it has several parallel tasks) and transitions; a document's run holds the current stage and the
// run's fields; every step it takes is an event. Types only: the engine never touches Payload.

/**
 * A title or description: a string, or one per admin language (`{ en: "Review", de: "Prüfung" }`),
 * like Payload's static labels. Views resolve it for the request's language.
 */
export type Label = string | Record<string, string>;

/**
 * A person or an agent: a user of the admin user collection (`admin.user`), by id. Only those users
 * take part in workflows, so an id alone names them.
 */
export type UserActor = { id: string; via: "admin" | "api" | "agent" };
/** The engine itself (cascade, hooks, tick, effects). `id` is declared so `actor.id` reads as optional. */
export type SystemActor = { system: true; id?: undefined; via?: undefined };
export type Actor = UserActor | SystemActor;

export type ActivityStatus = "active" | "done" | "skipped" | "failed";
export type ResolvedStatus = Exclude<ActivityStatus, "active">;

/** `user`: the id of a user of the admin user collection (`admin.user`), the only users who take part. */
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
  title?: Label;
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
  title?: Label;
  description?: Label;
  required?: boolean;
  /** Choices of a `select` param. */
  options?: (string | { label: string; value: string })[];
  /**
   * Most characters a `string` or `text` param accepts (default `TEXT_MAX_LENGTH`, 5000): what a
   * caller sends is kept in the history for good. Longer input is `invalid-params`.
   */
  maxLength?: number;
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
  title?: Label;
  description?: Label;
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
  /**
   * Whether an agent (a caller with `actor.via === "agent"`) may fire it. Default `"allow"`: an
   * agent may do exactly what the user behind it may do. `"deny"` reserves the step for a person.
   */
  agents?: "allow" | "deny";
}

/** Fired by the engine as soon as `when` is true, at most once per stage visit. Never callable. */
export interface AutoActionDef extends ActionBase {
  when: Condition;
  set?: Patch | ((ctx: ActionContext) => Patch);
  params?: undefined;
  filter?: undefined;
  roles?: undefined;
  agents?: undefined;
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
  title?: Label;
  description?: Label;
  /**
   * Evaluated once, on entering the stage: `true` skips the activity for this visit (`skipped`).
   * Not the action's `filter` (may this caller fire it, checked every time).
   */
  skipIf?: Condition;
  actions: ActionDef[];
}

export interface TransitionDef {
  name: string;
  title?: Label;
  to: string;
  /** Defaults to "every activity is done or skipped". */
  when?: Condition;
}

export type GuardOperation = "publish" | "update" | "delete";

export interface GuardDef {
  name: string;
  title?: Label;
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
  title?: Label;
  description?: Label;
  actions?: ActionDef[];
  activities?: ActivityDef[];
  /** None => terminal: entering the stage completes the run. */
  transitions?: TransitionDef[];
  guards?: GuardDef[];
}

/**
 * How a run starts by itself: when a document is created (and `when`, if given, holds for it).
 * Without `start` a person (or agent) starts it.
 */
export interface StartOnCreate {
  on: "create";
  when?: (args: { doc: Record<string, unknown> }) => boolean;
}

export interface WorkflowDefinition {
  name: string;
  title?: Label;
  description?: Label;
  /**
   * Stamped on every run started from this definition. Default: a short hash of its structure
   * (stage, activity, action, transition and field names, transition targets, field types), so a
   * run can tell that the workflow changed since it started. `defineWorkflow` fills it in.
   */
  version?: string | number;
  collections: string[];
  start?: StartOnCreate;
  /**
   * The terminal stage (or stages) that approve: every publish of a document it covers needs a
   * run of this workflow that completed in one of them and that no publish has used yet; the
   * publish uses it. A run that ended in another terminal stage does not count. Needs drafts on
   * its collections.
   */
  requiredToPublish?: string | string[];
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

/** A user (of the admin user collection) as a cause names them. */
export interface UserRef {
  id: string;
}

/**
 * Why the system took a step (on entries whose actor is the system): a person's or agent's step in
 * the same operation (`step`), a document save or delete (with who did it, when known), the auto
 * start on create, the tick, or an effect reporting back (with its Payload job id).
 */
export type Cause =
  | { kind: "step" }
  | { kind: "start" }
  | { kind: "save"; by?: UserRef }
  | { kind: "delete"; by?: UserRef }
  | { kind: "tick" }
  | { kind: "effect"; effect: string; job?: string };

interface EventBase {
  /** 1, 2, 3, … per run, gap-free: the order of the run's history. */
  seq: number;
  at: string;
  actor: Actor;
  /** On entries the system made: what caused them. */
  cause?: Cause;
}

/** The entries this version of the plugin writes. */
export type KnownWorkflowEvent = EventBase &
  (
    | { type: "started"; stage: string; definitionVersion: string }
    | {
        type: "action";
        stage: string;
        activity: string;
        action: string;
        params?: Record<string, unknown>;
      }
    | { type: "transition"; stage: string; transition: string; toStage: string }
    | {
        type: "effect";
        /** The stage the effect was queued in. */
        stage: string;
        effect: string;
        status: "queued" | "done" | "failed";
        error?: string;
        /**
         * The effect finished after the run had left the stage visit that queued it: the fields it
         * reported were ignored.
         */
        stale?: true;
        /** The Payload job (`payload-jobs`) that runs it. */
        job?: string;
      }
    | { type: "completed"; stage: string }
    | { type: "aborted"; stage: string; reason?: string }
    | {
        /**
         * A write went through with the bypass flag (`WORKFLOW_BYPASS`) that a holding guard, or
         * `requiredToPublish` (named `"requiredToPublish"` in `guards`), would have refused.
         */
        type: "guard-bypassed";
        stage: string;
        operation: GuardOperation;
        guards: string[];
      }
    | {
        /** A publish of the document went through on this completed run (`requiredToPublish`). */
        type: "published";
        stage: string;
      }
  );

/**
 * An entry of a type this version does not know (written by a later one). Consumers must handle
 * it: narrow with `isKnownEvent` first, and show or skip the rest. Unknown fields are kept.
 */
export interface UnknownWorkflowEvent extends EventBase {
  type: string;
  stage?: string;
  [key: string]: unknown;
}

/** One entry of a run's history: a row of the `workflow-events` collection. */
export type WorkflowEvent = KnownWorkflowEvent | UnknownWorkflowEvent;

export type InstanceStatus = "active" | "completed" | "aborted";

/** A run: the current stage, the run's fields, and what the engine needs to decide. */
export interface InstanceState {
  workflow: string;
  stage: string;
  status: InstanceStatus;
  fields: Record<string, unknown>;
  /** Statuses of the current stage's activities, this visit. */
  activities: Record<string, ActivityState>;
  /** `activity/action` auto actions already fired this stage visit. */
  fired: string[];
  /** Which visit of its stage the run is in: the transitions it has taken. */
  visit: number;
  /** The stages it has entered, each once, in the order first entered (the current one too). */
  visited: string[];
  /** The `seq` its next event gets. */
  nextSeq: number;
  /** The definition version it started from (`WorkflowDefinition.version`). */
  definitionVersion: string;
  startedBy: Actor;
  startedAt: string;
  completedAt?: string;
  /** When a publish went through on this completed run (`requiredToPublish`): it is used. */
  publishedAt?: string;
}

/** What conditions read besides the run (the document and the clock), and what caused the step. */
export interface Env {
  doc: Record<string, unknown> | null;
  now: Date;
  /** Stamped on the entries the system makes in this step. */
  cause?: Cause;
}

export interface Caller {
  actor: UserActor;
  roles: string[];
}

export interface QueuedEffect {
  name: string;
  activity: string;
  action: string;
  /** The stage the action fired in. */
  stage: string;
  /** Which visit of that stage (transitions taken before it): its `{ set }` lands only there. */
  visit: number;
}

/** What every engine operation returns: the new state, the effects it queued and its events. */
export interface Result {
  state: InstanceState;
  effects: QueuedEffect[];
  /** Numbered from the state's `nextSeq`; the new state's `nextSeq` follows the last. */
  events: KnownWorkflowEvent[];
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
   * roles), `agents` (reserved for a person: `agents: "deny"` and the caller is an agent),
   * `not-active` (run or activity no longer active), `error` (a condition threw).
   */
  reasonCode?: ViewActionReason;
  params: ViewParam[];
}

/** A param as a view shows it: title and description in the request's language. */
export type ViewParam = Omit<ParamDef, "title" | "description"> & {
  title?: string;
  description?: string;
};

export type ViewActionReason =
  | "filter"
  | "assignment"
  | "roles"
  | "agents"
  | "not-active"
  | "error";

export type StageState = "current" | "visited" | "unvisited";

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
  /**
   * Every stage in declaration order: the `current` one, those this run has `visited`, and those
   * it has not (`unvisited`): what happened, not a position in a line.
   */
  stages: { name: string; title: string; state: StageState }[];
  activities: ViewActivity[];
  guards: { name: string; title: string; operations: string[] }[];
  /** User ids and roles the run waits on. */
  waitingOn: { users: string[]; roles: string[] };
  fields: Record<string, unknown>;
  /** The most recent history entries, oldest first (at most `HISTORY_IN_VIEW`). */
  history: WorkflowEvent[];
  /** How many entries are older than `history` (read them with `getWorkflowHistory`). */
  olderHistory: number;
  /** Who started the run and when. */
  started: { at: string; actor: Actor };
  /** The definition version the run started from. */
  definitionVersion: string;
  /** The workflow's definition changed (in structure) since the run started. */
  definitionChanged: boolean;
  /**
   * The definition's titles, so the history can name what it records even after the run left the
   * stage. Keyed by `stage`, `stage/activity`, `stage/activity/action` and
   * `stage/activity/action/param`; names without a declared title are left out.
   */
  titles: Record<string, string>;
  canAbort: boolean;
  /**
   * The workflow is `requiredToPublish`: the terminal stages that approve. A publish needs a run
   * completed in one of them that no publish has used.
   */
  requiredToPublish?: string[];
  /** When a publish went through on this run: it can let no other publish through. */
  publishedAt?: string;
  subject?: { collection: string; id: string; title?: string };
}
