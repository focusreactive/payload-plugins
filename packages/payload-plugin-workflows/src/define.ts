import type {
  ActionDef,
  ActivityDef,
  FieldDef,
  GuardDef,
  StageDef,
  TransitionDef,
  WorkflowDefinition,
} from "./types.js";
import { assertValidDefinition } from "./validate.js";

/**
 * Declares a workflow and validates it at once, reporting every problem in one error. The plugin
 * validates again, so a definition built by hand is checked too.
 */
export const defineWorkflow = (definition: WorkflowDefinition): WorkflowDefinition => {
  assertValidDefinition(definition);
  return definition;
};

// Identity helpers: they only give a piece of a definition its type when written on its own.
export const defineStage = (stage: StageDef): StageDef => stage;
export const defineActivity = (activity: ActivityDef): ActivityDef => activity;
export const defineAction = (action: ActionDef): ActionDef => action;
export const defineTransition = (transition: TransitionDef): TransitionDef => transition;
export const defineField = (field: FieldDef): FieldDef => field;
export const defineGuard = (guard: GuardDef): GuardDef => guard;
