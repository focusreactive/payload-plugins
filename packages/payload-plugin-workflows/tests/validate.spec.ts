import { describe, expect, it } from "vitest";

import { defineWorkflow } from "../src/define.js";
import type { WorkflowDefinition } from "../src/types.js";
import { definitionIssues } from "../src/validate.js";
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
      'stages[1].activities: terminal stage "b" (no transitions) cannot declare activities',
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

  it("when actions have no params, filter or roles", () => {
    const issues = issuesOf((d) =>
      workA(d).actions.push({
        name: "auto",
        when: () => true,
        params: [{ name: "p", type: "string" }],
        filter: () => true,
        roles: ["x"],
      } as never)
    );
    expect(issues).toEqual([
      'stages[0].activities[0].actions[1].params: automatic action "auto" (with `when`) cannot declare `params`',
      'stages[0].activities[0].actions[1].filter: automatic action "auto" (with `when`) cannot declare `filter`',
      'stages[0].activities[0].actions[1].roles: automatic action "auto" (with `when`) cannot declare `roles`',
    ]);
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

describe("defineWorkflow", () => {
  it("returns the definition when valid", () => {
    const def = minimal();
    expect(defineWorkflow(def)).toBe(def);
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
