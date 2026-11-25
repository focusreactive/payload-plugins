import { describe, expect, it } from "vitest";

import { defineWorkflow, definitionIssues, definitionVersionOf } from "../src/define.js";
import type { WorkflowDefinition } from "../src/types.js";
import { editorialReview, minimal } from "./fixtures.js";

const issuesOf = (change: (def: WorkflowDefinition) => void): string[] => {
  const def = minimal();
  change(def);
  return definitionIssues(def);
};

const stageA = (def: WorkflowDefinition) => def.stages[0]!;
const workA = (def: WorkflowDefinition) => stageA(def).activities![0]!;

describe("validateDefinition", () => {
  it("accepts the spec example and the minimal definition", () => {
    expect(definitionIssues(editorialReview)).toEqual([]);
    expect(definitionIssues(minimal())).toEqual([]);
  });

  it("name format", () => {
    expect(issuesOf((d) => (d.name = "Bad Name"))).toEqual([
      'name: "Bad Name" must match ^[a-z0-9][a-z0-9-]*$',
    ]);
    expect(issuesOf((d) => (d.name = "-x"))).toHaveLength(1);
    expect(issuesOf((d) => (d.name = "ok-2"))).toEqual([]);
  });

  it("collections non-empty", () => {
    expect(issuesOf((d) => (d.collections = []))).toEqual([
      "collections: at least one subject collection is required",
    ]);
  });

  it("unique stage names", () => {
    expect(issuesOf((d) => d.stages.push({ name: "b" }))).toEqual([
      'stages[2].name: duplicate stage name "b"',
    ]);
  });

  it("unique activity names per stage", () => {
    expect(
      issuesOf((d) =>
        stageA(d).activities!.push({ name: "work", actions: [{ name: "x", status: "done" }] })
      )
    ).toEqual(['stages[0].activities[1].name: duplicate activity name "work"']);
  });

  it("unique action names per activity", () => {
    expect(issuesOf((d) => workA(d).actions.push({ name: "finish" }))).toEqual([
      'stages[0].activities[0].actions[1].name: duplicate action name "finish"',
    ]);
  });

  it("unique transition names per stage", () => {
    expect(issuesOf((d) => stageA(d).transitions!.push({ name: "next", to: "b" }))).toEqual([
      'stages[0].transitions[1].name: duplicate transition name "next"',
    ]);
  });

  it("unique field names", () => {
    expect(issuesOf((d) => d.fields!.push({ name: "owner", type: "string" }))).toEqual([
      'fields[1].name: duplicate field name "owner"',
    ]);
  });

  it("initialStage declared", () => {
    const issues = issuesOf((d) => (d.initialStage = "zzz"));
    expect(issues).toEqual([
      'initialStage: initial stage "zzz" is not a declared stage. Known stages: "a", "b"',
    ]);
  });

  it("every transition target declared", () => {
    expect(issuesOf((d) => (stageA(d).transitions![0]!.to = "ready"))).toContain(
      'stages[0].transitions[0].to: transition target "ready" is not a declared stage. Known stages: "a", "b"'
    );
  });

  it("every stage reachable from initialStage", () => {
    expect(issuesOf((d) => d.stages.push({ name: "orphan" }))).toEqual([
      'stages[2]: stage "orphan" is not reachable from initial stage "a"',
    ]);
  });

  it("terminal stage has no activities", () => {
    expect(
      issuesOf(
        (d) => (d.stages[1]!.activities = [{ name: "w", actions: [{ name: "x", status: "done" }] }])
      )
    ).toEqual([
      'stages[1].activities: terminal stage "b" (no transitions) cannot declare actions or activities',
    ]);
  });

  it("every activity has an action with a status", () => {
    expect(issuesOf((d) => (workA(d).actions = [{ name: "note" }]))).toEqual([
      'stages[0].activities[0].actions: activity "work" needs at least one action with a status, or it can never finish',
    ]);
  });

  it("assignee names a declared user field", () => {
    expect(issuesOf((d) => (workA(d).assignee = "nobody"))).toEqual([
      'stages[0].activities[0].assignee: assignee "nobody" is not a declared field of type "user"',
    ]);
    expect(
      issuesOf((d) => {
        d.fields!.push({ name: "note", type: "string" });
        workA(d).assignee = "note";
      })
    ).toHaveLength(1);
    expect(issuesOf((d) => (workA(d).assignee = "owner"))).toEqual([]);
  });

  it("static set keys are declared fields", () => {
    expect(
      issuesOf(
        (d) => (workA(d).actions[0] = { name: "finish", status: "done", set: { missing: 1 } })
      )
    ).toEqual([
      'stages[0].activities[0].actions[0].set.missing: "missing" is not a declared field. Known fields: "owner"',
    ]);
  });

  it("when actions have no params, filter, roles or agents", () => {
    const issues = issuesOf((d) =>
      workA(d).actions.push({
        name: "auto",
        when: () => true,
        params: [{ name: "p", type: "string" }],
        filter: () => true,
        roles: ["x"],
        agents: "deny",
      } as never)
    );
    expect(issues).toEqual([
      'stages[0].activities[0].actions[1].params: automatic action "auto" (with `when`) cannot declare `params`',
      'stages[0].activities[0].actions[1].filter: automatic action "auto" (with `when`) cannot declare `filter`',
      'stages[0].activities[0].actions[1].roles: automatic action "auto" (with `when`) cannot declare `roles`',
      'stages[0].activities[0].actions[1].agents: automatic action "auto" (with `when`) cannot declare `agents`',
    ]);
  });

  it("agents is allow or deny", () => {
    expect(issuesOf((d) => (workA(d).actions[0]!.agents = "maybe" as never))).toEqual([
      'stages[0].activities[0].actions[0].agents: agents must be "allow" or "deny"',
    ]);
    expect(issuesOf((d) => (workA(d).actions[0]!.agents = "deny"))).toEqual([]);
  });

  it("select params need options; guards need operations; names are required", () => {
    expect(
      issuesOf((d) => (workA(d).actions[0]!.params = [{ name: "s", type: "select" }] as never))
    ).toEqual([
      'stages[0].activities[0].actions[0].params[0].options: select param "s" needs options',
    ]);
    expect(issuesOf((d) => (stageA(d).guards = [{ name: "g", operations: [] }]))).toEqual([
      'stages[0].guards[0].operations: guard "g" needs at least one operation',
    ]);
    expect(issuesOf((d) => (workA(d).actions[0]!.name = "a/b"))).toEqual([
      'stages[0].activities[0].actions[0].name: action needs a non-empty name without "/"',
    ]);
  });
});

describe("reserved names", () => {
  it("rejects field, param, stage, activity and action names that are Object.prototype members", () => {
    expect(issuesOf((d) => (d.fields![0]!.name = "constructor"))).toEqual([
      'fields[0].name: field name "constructor" is reserved (it is an `Object.prototype` member)',
    ]);
    expect(
      issuesOf((d) => (workA(d).actions[0]!.params = [{ name: "__proto__", type: "string" }]))
    ).toEqual([
      'stages[0].activities[0].actions[0].params[0].name: param name "__proto__" is reserved (it is an `Object.prototype` member)',
    ]);
    expect(issuesOf((d) => (workA(d).name = "toString"))).toEqual([
      'stages[0].activities[0].name: activity name "toString" is reserved (it is an `Object.prototype` member)',
    ]);
    expect(issuesOf((d) => (workA(d).actions[0]!.name = "hasOwnProperty"))).toEqual([
      'stages[0].activities[0].actions[0].name: action name "hasOwnProperty" is reserved (it is an `Object.prototype` member)',
    ]);
    expect(
      issuesOf((d) => {
        d.stages[1]!.name = "valueOf";
        stageA(d).transitions![0]!.to = "valueOf";
      })
    ).toEqual([
      'stages[1].name: stage name "valueOf" is reserved (it is an `Object.prototype` member)',
    ]);
  });

  it("`input` must be a boolean", () => {
    expect(issuesOf((d) => (d.fields![0]!.input = "yes" as never))).toEqual([
      'fields[0].input: field "owner" `input` must be a boolean',
    ]);
    expect(issuesOf((d) => (d.fields![0]!.input = true))).toEqual([]);
  });
});

describe("plain stage actions", () => {
  /** `minimal()` with stage "a" written with plain `actions`. */
  const plain = (change: (stage: WorkflowDefinition["stages"][number]) => void = () => {}) => {
    const def = minimal();
    def.stages[0] = {
      name: "a",
      assignee: "owner",
      actions: [{ name: "finish", status: "done" }],
      transitions: [{ name: "next", to: "b" }],
    };
    change(def.stages[0]);
    return def;
  };

  it("are valid on their own, and checked at the stage's path", () => {
    expect(definitionIssues(plain())).toEqual([]);
    expect(definitionIssues(plain((stage) => (stage.actions = [{ name: "note" }])))).toEqual([
      'stages[0].actions: stage "a" needs at least one action with a status, or it can never finish',
    ]);
    expect(definitionIssues(plain((stage) => (stage.assignee = "nobody")))).toEqual([
      'stages[0].assignee: assignee "nobody" is not a declared field of type "user"',
    ]);
  });

  it("cannot be mixed with activities, and the stage's assignee and roles need them", () => {
    expect(
      definitionIssues(
        plain(
          (stage) => (stage.activities = [{ name: "w", actions: [{ name: "x", status: "done" }] }])
        )
      )
    ).toEqual([
      'stages[0].activities: stage "a" declares both `actions` and `activities`: use `actions` for one task, `activities` for several',
    ]);
    const def = minimal();
    def.stages[0]!.roles = ["editor"];
    expect(definitionIssues(def)).toEqual([
      "stages[0].roles: a stage's `assignee` and `roles` apply to its plain `actions`; with `activities`, set them on each activity",
    ]);
  });

  it("are not allowed on a terminal stage", () => {
    const def = minimal();
    def.stages[1] = { name: "b", actions: [{ name: "x", status: "done" }] };
    expect(definitionIssues(def)).toEqual([
      'stages[1].actions: terminal stage "b" (no transitions) cannot declare actions or activities',
    ]);
  });

  it("become one activity named after the stage", () => {
    const [stage] = defineWorkflow(plain()).stages;
    expect(stage).toEqual({
      name: "a",
      activities: [{ name: "a", assignee: "owner", actions: [{ name: "finish", status: "done" }] }],
      transitions: [{ name: "next", to: "b" }],
    });
  });
});

describe("defineWorkflow", () => {
  it("returns the definition when valid, with its version filled in", () => {
    const def = minimal();
    expect(defineWorkflow(def)).toEqual({ ...def, version: definitionVersionOf(def) });
  });

  it("throws one error collecting every problem, path-prefixed", () => {
    const def = minimal();
    def.name = "article-review";
    stageA(def).transitions![0]!.to = "ready";
    def.fields!.push({ name: "owner", type: "string" });
    expect(() => defineWorkflow(def)).toThrowError(
      [
        'defineWorkflow("article-review") failed validation (3 issues):',
        '  - fields[1].name: duplicate field name "owner"',
        '  - stages[0].transitions[0].to: transition target "ready" is not a declared stage. Known stages: "a", "b"',
        '  - stages[1]: stage "b" is not reachable from initial stage "a"',
      ].join("\n")
    );
  });

  it("uses the singular for one issue", () => {
    const def = minimal();
    def.collections = [];
    expect(() => defineWorkflow(def)).toThrowError(
      'defineWorkflow("minimal") failed validation (1 issue):\n  - collections: at least one subject collection is required'
    );
  });
});

describe("start", () => {
  it('is left out (a person starts it) or `{ on: "create", when? }`; the string forms are gone', () => {
    expect(issuesOf((def) => (def.start = { on: "create" }))).toEqual([]);
    expect(issuesOf((def) => (def.start = { on: "create", when: () => true }))).toEqual([]);
    for (const old of ["manual", "onCreate", { on: "update" }]) {
      expect(issuesOf((def) => (def.start = old as never))).toEqual([
        'start: start must be `{ on: "create", when? }` (started when a document is created); leave it out for a workflow people start',
      ]);
    }
  });
});

describe("param maxLength", () => {
  const withParam = (param: object) =>
    issuesOf((def) => {
      workA(def).actions.push({ name: "note", params: [{ name: "text", ...param } as never] });
    });

  it("is a positive integer, on string and text params only", () => {
    expect(withParam({ type: "text", maxLength: 200 })).toEqual([]);
    expect(withParam({ type: "string", maxLength: 0 })).toEqual([
      'stages[0].activities[0].actions[1].params[0].maxLength: param "text" `maxLength` must be a positive integer',
    ]);
    expect(withParam({ type: "number", maxLength: 3 })).toEqual([
      'stages[0].activities[0].actions[1].params[0].maxLength: `maxLength` applies to "string" and "text" params, not "number"',
    ]);
  });
});

describe("definition version", () => {
  it("is the declared one, else a short hash of the structure", () => {
    expect(definitionVersionOf({ ...minimal(), version: 3 })).toBe("3");
    expect(definitionVersionOf({ ...minimal(), version: "2026-11" })).toBe("2026-11");
    expect(definitionVersionOf(minimal())).toMatch(/^[0-9a-z]{1,11}$/u);
    expect(issuesOf((def) => (def.version = ""))).toEqual([
      "version: version must be a non-empty string or a number",
    ]);
  });

  it("changes with names, order, transition targets and field types, not titles or functions", () => {
    const base = definitionVersionOf(minimal());
    const changed = (change: (def: WorkflowDefinition) => void) => {
      const def = minimal();
      change(def);
      return definitionVersionOf(def);
    };
    // Not structure: titles, descriptions, conditions, statuses.
    expect(
      changed((def) => {
        def.title = { en: "Minimal", de: "Minimal" };
        stageA(def).title = "A";
        stageA(def).description = "First";
        workA(def).skipIf = () => false;
        workA(def).actions[0]!.title = "Finish it";
      })
    ).toBe(base);
    // Structure.
    expect(changed((def) => (workA(def).actions[0]!.name = "complete"))).not.toBe(base);
    expect(changed((def) => (stageA(def).transitions![0]!.to = "a"))).not.toBe(base);
    expect(changed((def) => (def.fields![0]!.type = "string"))).not.toBe(base);
    expect(changed((def) => def.stages.reverse())).not.toBe(base);
    expect(changed((def) => (def.name = "other"))).not.toBe(base);
  });

  it("is the same for plain stage `actions` and the one activity they stand for", () => {
    expect(definitionVersionOf(editorialReview)).toBe(editorialReview.version);
    const raw: WorkflowDefinition = {
      name: "x",
      collections: ["pages"],
      initialStage: "a",
      stages: [
        {
          name: "a",
          actions: [{ name: "go", status: "done" }],
          transitions: [{ name: "t", to: "b" }],
        },
        { name: "b" },
      ],
    };
    expect(defineWorkflow(raw).version).toBe(definitionVersionOf(raw));
    expect(defineWorkflow(defineWorkflow(raw)).version).toBe(definitionVersionOf(raw));
  });
  it("requiredToPublish names one or more terminal stages", () => {
    const requiredIssues = (requiredToPublish: unknown) =>
      definitionIssues({ ...minimal(), requiredToPublish } as unknown as WorkflowDefinition);
    expect(requiredIssues("b")).toEqual([]);
    expect(requiredIssues(["b"])).toEqual([]);
    const booleanForm =
      'requiredToPublish: requiredToPublish names the terminal stage(s) that approve, e.g. `requiredToPublish: "approved"` or `["approved", "approved-with-edits"]`; `true` / `false` are no longer accepted';
    expect(requiredIssues(true)).toEqual([booleanForm]);
    expect(requiredIssues(false)).toEqual([booleanForm]);
    const shape =
      "requiredToPublish: requiredToPublish must be a terminal stage name or a non-empty list of them";
    expect(requiredIssues([])).toEqual([shape]);
    expect(requiredIssues(["b", 3])).toEqual([shape]);
    expect(requiredIssues("")).toEqual([shape]);
    expect(requiredIssues("a")).toEqual([
      'requiredToPublish: stage "a" is not terminal (it has transitions): only a stage the workflow ends in can approve a publish',
    ]);
    expect(requiredIssues(["b", "approved"])).toEqual([
      'requiredToPublish: stage "approved" is not a declared stage. Known stages: "a", "b"',
    ]);
    expect(() => defineWorkflow({ ...minimal(), requiredToPublish: "nope" })).toThrowError(
      'stage "nope" is not a declared stage'
    );
  });
});
