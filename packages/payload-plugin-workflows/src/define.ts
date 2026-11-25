import type { ActivityDef, StageDef, WorkflowDefinition } from "./types.js";

export const WORKFLOW_NAME = /^[a-z0-9][a-z0-9-]*$/u;

/**
 * A stage's activities, each with the path it is written at. Plain `actions` on a stage are one
 * activity named after the stage, written at the stage itself (`stages[0].actions[1]`).
 */
export const activitiesWithPaths = (
  stage: StageDef,
  path: string
): { activity: ActivityDef; path: string; implicit: boolean }[] => {
  if (stage.actions) {
    const { name, title, assignee, roles, actions } = stage;
    const activity: ActivityDef = {
      name,
      actions,
      ...(title === undefined ? {} : { title }),
      ...(assignee === undefined ? {} : { assignee }),
      ...(roles === undefined ? {} : { roles }),
    };
    return [{ activity, path, implicit: true }];
  }
  return (stage.activities ?? []).map((activity, j) => ({
    activity,
    path: `${path}.activities[${j}]`,
    implicit: false,
  }));
};

/** The one shape the engine works on: every stage's task as `activities`. Idempotent. */
const normalize = (def: WorkflowDefinition): WorkflowDefinition => ({
  ...def,
  stages: def.stages.map((stage) => {
    if (!stage.actions) {
      return stage;
    }
    const { actions: _actions, assignee: _assignee, roles: _roles, ...rest } = stage;
    return { ...rest, activities: activitiesWithPaths(stage, "").map((entry) => entry.activity) };
  }),
});

// ---- Validation -----------------------------------------------------------------------------

type Issue = { path: string; message: string };

const quoted = (values: string[]) => values.map((value) => `"${value}"`).join(", ");

/** Reports each repeated name once, at the path of its second occurrence. */
const checkUnique = (
  issues: Issue[],
  items: { name: string }[],
  path: (index: number) => string,
  what: string
) => {
  const seen = new Set<string>();
  const reported = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.name) && !reported.has(item.name)) {
      issues.push({
        path: `${path(index)}.name`,
        message: `duplicate ${what} name "${item.name}"`,
      });
      reported.add(item.name);
    }
    seen.add(item.name);
  });
};

/** Names that would read or write `Object.prototype` members on the plain objects state uses. */
const RESERVED = new Set([...Object.getOwnPropertyNames(Object.prototype), "__proto__"]);

const checkNamed = (issues: Issue[], item: { name?: unknown }, path: string, what: string) => {
  if (typeof item.name !== "string" || item.name.length === 0 || item.name.includes("/")) {
    issues.push({ path: `${path}.name`, message: `${what} needs a non-empty name without "/"` });
  } else if (RESERVED.has(item.name)) {
    issues.push({
      path: `${path}.name`,
      message: `${what} name "${item.name}" is reserved (it is an \`Object.prototype\` member)`,
    });
  }
};

const reachable = (def: WorkflowDefinition): Set<string> => {
  const seen = new Set<string>();
  const queue = [def.initialStage];
  while (queue.length > 0) {
    const name = queue.shift() as string;
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    const stage = def.stages.find((entry) => entry.name === name);
    for (const transition of stage?.transitions ?? []) {
      queue.push(transition.to);
    }
  }
  return seen;
};

const checkActivity = (
  issues: Issue[],
  def: WorkflowDefinition,
  { activity, path, implicit }: ReturnType<typeof activitiesWithPaths>[number]
) => {
  if (!implicit) {
    checkNamed(issues, activity, path, "activity");
  }
  const actions = activity.actions ?? [];
  checkUnique(issues, actions, (k) => `${path}.actions[${k}]`, "action");
  if (!actions.some((action) => action.status)) {
    issues.push({
      path: `${path}.actions`,
      message: `${implicit ? "stage" : "activity"} "${activity.name}" needs at least one action with a status, or it can never finish`,
    });
  }
  const fields = def.fields ?? [];
  if (activity.assignee !== undefined) {
    const field = fields.find((entry) => entry.name === activity.assignee);
    if (field?.type !== "user") {
      issues.push({
        path: `${path}.assignee`,
        message: `assignee "${activity.assignee}" is not a declared field of type "user"`,
      });
    }
  }
  const declared = fields.map((field) => field.name);
  actions.forEach((action, k) => {
    const actionPath = `${path}.actions[${k}]`;
    checkNamed(issues, action, actionPath, "action");
    if (action.set && typeof action.set === "object") {
      for (const key of Object.keys(action.set)) {
        if (!declared.includes(key)) {
          issues.push({
            path: `${actionPath}.set.${key}`,
            message: `"${key}" is not a declared field. Known fields: ${quoted(declared)}`,
          });
        }
      }
    }
    if (typeof action.when === "function") {
      for (const key of ["params", "filter", "roles", "agents"] as const) {
        if (action[key] !== undefined) {
          issues.push({
            path: `${actionPath}.${key}`,
            message: `automatic action "${action.name}" (with \`when\`) cannot declare \`${key}\``,
          });
        }
      }
    }
    if (action.agents !== undefined && action.agents !== "allow" && action.agents !== "deny") {
      issues.push({
        path: `${actionPath}.agents`,
        message: `agents must be "allow" or "deny"`,
      });
    }
    (action.params ?? []).forEach((param, p) => {
      checkNamed(issues, param, `${actionPath}.params[${p}]`, "param");
      if (param.type === "select" && (param.options ?? []).length === 0) {
        issues.push({
          path: `${actionPath}.params[${p}].options`,
          message: `select param "${param.name}" needs options`,
        });
      }
    });
  });
};

const checkStage = (
  issues: Issue[],
  def: WorkflowDefinition,
  stage: StageDef,
  path: string,
  known: string[]
) => {
  checkNamed(issues, stage, path, "stage");
  const transitions = stage.transitions ?? [];
  if (stage.actions && stage.activities) {
    issues.push({
      path: `${path}.activities`,
      message: `stage "${stage.name}" declares both \`actions\` and \`activities\`: use \`actions\` for one task, \`activities\` for several`,
    });
  } else if (stage.activities && (stage.assignee !== undefined || stage.roles !== undefined)) {
    issues.push({
      path: `${path}.${stage.assignee === undefined ? "roles" : "assignee"}`,
      message: `a stage's \`assignee\` and \`roles\` apply to its plain \`actions\`; with \`activities\`, set them on each activity`,
    });
  }
  checkUnique(issues, stage.activities ?? [], (j) => `${path}.activities[${j}]`, "activity");
  checkUnique(issues, transitions, (j) => `${path}.transitions[${j}]`, "transition");
  checkUnique(issues, stage.guards ?? [], (j) => `${path}.guards[${j}]`, "guard");
  const activities = activitiesWithPaths(stage, path);
  if (transitions.length === 0 && activities.length > 0) {
    issues.push({
      path: `${path}.${stage.actions ? "actions" : "activities"}`,
      message: `terminal stage "${stage.name}" (no transitions) cannot declare actions or activities`,
    });
  }
  transitions.forEach((transition, j) => {
    checkNamed(issues, transition, `${path}.transitions[${j}]`, "transition");
    if (!known.includes(transition.to)) {
      issues.push({
        path: `${path}.transitions[${j}].to`,
        message: `transition target "${transition.to}" is not a declared stage. Known stages: ${quoted(known)}`,
      });
    }
  });
  (stage.guards ?? []).forEach((guard, j) => {
    if ((guard.operations ?? []).length === 0) {
      issues.push({
        path: `${path}.guards[${j}].operations`,
        message: `guard "${guard.name}" needs at least one operation`,
      });
    }
  });
  for (const entry of activities) {
    checkActivity(issues, def, entry);
  }
};

/** Every problem with a definition, path-prefixed. Empty when it is valid. */
export const definitionIssues = (def: WorkflowDefinition): string[] => {
  const issues: Issue[] = [];
  if (typeof def.name !== "string" || !WORKFLOW_NAME.test(def.name)) {
    issues.push({ path: "name", message: `"${def.name}" must match ${WORKFLOW_NAME.source}` });
  }
  if (!Array.isArray(def.collections) || def.collections.length === 0) {
    issues.push({ path: "collections", message: "at least one subject collection is required" });
  }
  const stages = Array.isArray(def.stages) ? def.stages : [];
  if (stages.length === 0) {
    issues.push({ path: "stages", message: "at least one stage is required" });
  }
  const known = stages.map((stage) => stage.name);
  checkUnique(issues, stages, (i) => `stages[${i}]`, "stage");
  checkUnique(issues, def.fields ?? [], (i) => `fields[${i}]`, "field");
  (def.fields ?? []).forEach((field, i) => {
    checkNamed(issues, field, `fields[${i}]`, "field");
    if (field.input !== undefined && typeof field.input !== "boolean") {
      issues.push({
        path: `fields[${i}].input`,
        message: `field "${field.name}" \`input\` must be a boolean`,
      });
    }
  });
  if (!known.includes(def.initialStage)) {
    issues.push({
      path: "initialStage",
      message: `initial stage "${def.initialStage}" is not a declared stage. Known stages: ${quoted(known)}`,
    });
  }
  stages.forEach((stage, i) => checkStage(issues, def, stage, `stages[${i}]`, known));
  if (known.includes(def.initialStage)) {
    const seen = reachable(def);
    stages.forEach((stage, i) => {
      if (!seen.has(stage.name)) {
        issues.push({
          path: `stages[${i}]`,
          message: `stage "${stage.name}" is not reachable from initial stage "${def.initialStage}"`,
        });
      }
    });
  }
  return issues.map((issue) => `${issue.path}: ${issue.message}`);
};

/** One error listing every problem. */
export const formatIssues = (subject: string, issues: string[]): string =>
  `${subject} failed validation (${issues.length} issue${issues.length === 1 ? "" : "s"}):\n${issues
    .map((issue) => `  - ${issue}`)
    .join("\n")}`;

/**
 * Declares a workflow: validates it, reporting every problem in one error, and returns it in the
 * shape the engine works on (plain stage `actions` become one activity named after the stage).
 * The plugin and the simulator do the same, so a definition built by hand is checked too.
 */
export const defineWorkflow = (definition: WorkflowDefinition): WorkflowDefinition => {
  const issues = definitionIssues(definition);
  if (issues.length > 0) {
    throw new Error(formatIssues(`defineWorkflow("${definition.name}")`, issues));
  }
  return normalize(definition);
};
