import { describe, expect, it } from "vitest";

import { defineWorkflow } from "../src/define.js";
import { WorkflowError } from "../src/engine/errors.js";
import { TEXT_MAX_LENGTH } from "../src/constants.js";
import {
  CASCADE_LIMIT,
  abort,
  fire,
  holdMessage,
  mayAbort,
  patchFields,
  recordBypass,
  recordEffect,
  recordPublish,
  settle,
  start,
  validateParams,
} from "../src/engine/engine.js";
import { createWorkflowSimulator } from "../src/engine/simulator.js";
import { HISTORY_IN_VIEW, view } from "../src/engine/view.js";
import type {
  ActivityDef,
  Caller,
  Env,
  InstanceState,
  KnownWorkflowEvent,
  StageDef,
  WorkflowDefinition,
} from "../src/types.js";
import { NOW, author, editor, editorialReview } from "./fixtures.js";

const env = (over: Partial<Env> = {}): Env => ({ doc: null, now: NOW, ...over });
const caller = (id: string, roles: string[] = []): Caller => ({
  actor: { id, via: "api" },
  roles,
});

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (error) {
    if (error instanceof WorkflowError) {
      return error.code;
    }
    throw error;
  }
  return undefined;
};

const historyTypes = (events: KnownWorkflowEvent[]) =>
  events.map((entry) =>
    entry.type === "action"
      ? `action:${entry.activity}/${entry.action}${entry.actor.id === undefined ? "(auto)" : ""}`
      : entry.type === "transition"
        ? `transition:${entry.stage}->${entry.toStage}`
        : entry.type === "effect"
          ? `effect:${entry.effect}:${entry.status}`
          : entry.type
  );

const otherEditor = { user: "u-other", roles: ["editor"] };

const filteredDef = (wanted: boolean): WorkflowDefinition => ({
  name: "filtered",
  collections: ["pages"],
  initialStage: "a",
  stages: [
    {
      name: "a",
      activities: [
        {
          name: "legal",
          skipIf: ({ doc }) => doc?.sensitive !== wanted,
          actions: [{ name: "ok", status: "done" }],
        },
        { name: "copy", actions: [{ name: "ok", status: "done" }] },
      ],
      transitions: [{ name: "next", to: "b" }],
    },
    { name: "b" },
  ],
});

const guardedDef = (unless: () => boolean): WorkflowDefinition => ({
  name: "g",
  collections: ["pages"],
  initialStage: "a",
  stages: [
    {
      name: "a",
      guards: [{ name: "hold", operations: ["update"], unless }],
      activities: [{ name: "w", actions: [{ name: "ok", status: "done" }] }],
      transitions: [{ name: "n", to: "b" }],
    },
    { name: "b" },
  ],
});

describe("plain stage actions", () => {
  it("are one activity named after the stage, with the stage's title, assignee and roles", () => {
    const review = editorialReview.stages[1];
    expect(review?.actions).toBeUndefined();
    expect(review?.assignee).toBeUndefined();
    expect(review?.activities?.map(({ actions: _a, ...rest }) => rest)).toEqual([
      { name: "review", title: "Review", assignee: "reviewer", roles: ["editor"] },
    ]);
    expect(review?.activities?.[0]?.actions.map((action) => action.name)).toEqual([
      "reset",
      "claim",
      "approve",
      "reject",
    ]);
  });
});

describe("editorial review end to end", () => {
  it("runs submit -> claim -> reject -> back to drafting -> submit -> approve -> completed", () => {
    const sim = createWorkflowSimulator(editorialReview, { now: NOW });
    expect(sim.state.stage).toBe("drafting");
    expect(sim.state.activities).toEqual({ drafting: { status: "active" } });

    sim.fire("submit", author);
    expect(sim.state.stage).toBe("review");
    // `reset` fired on entry.
    expect(sim.state.fired).toEqual(["review/reset"]);

    sim.fire("claim", editor);
    expect(sim.state.fields.reviewer).toBe("u-editor");
    expect(sim.state.stage).toBe("review");

    sim.fire("reject", { ...editor, params: { reason: "Too long" } });
    expect(sim.state.stage).toBe("drafting");
    expect(sim.state.fields).toMatchObject({ decision: "rejected", reason: "Too long" });
    expect(sim.state.activities).toEqual({ drafting: { status: "active" } });
    expect(sim.state.fired).toEqual([]);

    sim.fire("submit", author);
    expect(sim.state.stage).toBe("review");
    // `reset` fired again on re-entry and cleared the previous decision.
    expect(sim.state.fields.decision).toBeUndefined();
    expect(sim.state.fields.reason).toBeUndefined();
    // The reviewer is still held, so nobody else may act.
    expect(
      sim.view(otherEditor).activities[0]?.actions.find((a) => a.name === "approve")?.allowed
    ).toBe(false);

    sim.fire("approve", editor);
    expect(sim.state.status).toBe("completed");
    expect(sim.state.stage).toBe("approved");
    expect(sim.state.completedAt).toBe(NOW.toISOString());
    // Queued in the third visit of a stage (three transitions before it): `review`, the second time.
    expect(sim.effects).toEqual([
      { name: "notify-author", activity: "review", action: "approve", stage: "review", visit: 3 },
    ]);
    expect(historyTypes(sim.events)).toEqual([
      "started",
      "action:drafting/submit",
      "transition:drafting->review",
      "action:review/reset(auto)",
      "action:review/claim",
      "action:review/reject",
      "transition:review->drafting",
      "action:drafting/submit",
      "transition:drafting->review",
      "action:review/reset(auto)",
      "action:review/approve",
      "effect:notify-author:queued",
      "transition:review->approved",
      "completed",
    ]);
    const reject = sim.events.find((e) => e.type === "action" && e.action === "reject");
    expect(reject).toMatchObject({ params: { reason: "Too long" }, actor: { id: "u-editor" } });
  });
});

describe("auto actions", () => {
  const def: WorkflowDefinition = {
    name: "auto",
    collections: ["pages"],
    initialStage: "a",
    fields: [
      { name: "count", type: "number", initialValue: 0 },
      { name: "go", type: "boolean" },
    ],
    stages: [
      {
        name: "a",
        activities: [
          {
            name: "work",
            actions: [
              {
                name: "bump",
                when: () => true,
                set: ({ fields }) => ({ count: Number(fields.count) + 1 }),
              },
              { name: "late", when: ({ fields }) => fields.go === true, set: { go: null } },
              { name: "finish", status: "done" },
              { name: "redo", status: "done" },
            ],
          },
        ],
        transitions: [{ name: "next", to: "b" }],
      },
      {
        name: "b",
        activities: [{ name: "work", actions: [{ name: "back", status: "done" }] }],
        transitions: [{ name: "again", to: "a" }],
      },
    ],
  };

  it("fires once per stage visit and again after re-entry", () => {
    const sim = createWorkflowSimulator(def, { now: NOW });
    expect(sim.state.fields.count).toBe(1);
    sim.advance(new Date(NOW.getTime() + 1000));
    sim.setDoc({ any: true });
    expect(sim.state.fields.count).toBe(1);
    sim.fire("finish", { activity: "work" });
    expect(sim.state.stage).toBe("b");
    sim.fire("back", { activity: "work" });
    expect(sim.state.stage).toBe("a");
    expect(sim.state.fields.count).toBe(2);
  });

  it("fires when its condition becomes true later, then not again", () => {
    const sim = createWorkflowSimulator(def, { now: NOW });
    expect(sim.state.fired).toEqual(["work/bump"]);
    sim.patch({ go: true });
    expect(sim.state.fired).toEqual(["work/bump", "work/late"]);
    expect(sim.state.fields.go).toBeUndefined();
    sim.patch({ go: true });
    expect(sim.state.fields.go).toBe(true);
  });

  it("is not callable", () => {
    const sim = createWorkflowSimulator(def, { now: NOW });
    expect(codeOf(() => sim.fire("bump", { activity: "work" }))).toBe("not-callable");
    expect(sim.view().activities[0]?.actions.map((a) => a.name)).toEqual(["finish", "redo"]);
  });

  it("does not fire on an activity that is already resolved", () => {
    const resolved: WorkflowDefinition = {
      name: "resolved",
      collections: ["pages"],
      initialStage: "a",
      fields: [
        { name: "flag", type: "boolean" },
        { name: "seen", type: "boolean" },
      ],
      stages: [
        {
          name: "a",
          activities: [
            {
              name: "one",
              actions: [
                { name: "done", status: "done" },
                { name: "auto", when: ({ fields }) => fields.flag === true, set: { seen: true } },
              ],
            },
            { name: "two", actions: [{ name: "done", status: "done" }] },
          ],
          transitions: [{ name: "next", to: "b" }],
        },
        { name: "b" },
      ],
    };
    const sim = createWorkflowSimulator(resolved, { now: NOW });
    sim.fire("done", { activity: "one" });
    sim.patch({ flag: true });
    expect(sim.state.fields.seen).toBeUndefined();
  });
});

describe("transitions", () => {
  it("takes the first open transition in declaration order", () => {
    const def: WorkflowDefinition = {
      name: "order",
      collections: ["pages"],
      initialStage: "a",
      stages: [
        {
          name: "a",
          activities: [{ name: "w", actions: [{ name: "ok", status: "done" }] }],
          transitions: [
            { name: "first", to: "b" },
            { name: "second", to: "c", when: () => true },
          ],
        },
        { name: "b" },
        { name: "c" },
      ],
    };
    const sim = createWorkflowSimulator(def, { now: NOW });
    // `second` is open from the start and wins over the not-yet-open default of `first`.
    expect(sim.state.stage).toBe("c");

    const def2: WorkflowDefinition = {
      ...def,
      stages: [
        {
          name: "a",
          activities: [{ name: "w", actions: [{ name: "ok", status: "done" }] }],
          transitions: [
            { name: "first", to: "b", when: () => true },
            { name: "second", to: "c", when: () => true },
          ],
        },
        { name: "b" },
        { name: "c" },
      ],
    };
    expect(createWorkflowSimulator(def2, { now: NOW }).state.stage).toBe("b");
  });

  it("does not count a failed activity as done", () => {
    const def: WorkflowDefinition = {
      name: "failing",
      collections: ["pages"],
      initialStage: "a",
      stages: [
        {
          name: "a",
          activities: [
            {
              name: "w",
              actions: [
                { name: "fail", status: "failed" },
                { name: "ok", status: "done" },
              ],
            },
          ],
          transitions: [
            { name: "next", to: "b" },
            { name: "failed", to: "c", when: ({ anyActivityFailed }) => anyActivityFailed },
          ],
        },
        { name: "b" },
        { name: "c" },
      ],
    };
    const sim = createWorkflowSimulator(def, { now: NOW });
    sim.fire("fail", { activity: "w" });
    expect(sim.state.stage).toBe("c");
  });
});

describe("activity skipIf", () => {
  it("skips an activity whose skipIf is true at stage entry; skipped counts as done", () => {
    const sim = createWorkflowSimulator(filteredDef(true), { now: NOW, doc: { sensitive: false } });
    expect(sim.state.activities.legal).toEqual({ status: "skipped", at: NOW.toISOString() });
    expect(codeOf(() => sim.fire("ok", { activity: "legal" }))).toBe("activity-not-active");
    sim.fire("ok", { activity: "copy" });
    expect(sim.state.status).toBe("completed");
  });

  it("keeps an activity whose skipIf is false", () => {
    const sim = createWorkflowSimulator(filteredDef(true), { now: NOW, doc: { sensitive: true } });
    expect(sim.state.activities.legal?.status).toBe("active");
    sim.fire("ok", { activity: "copy" });
    expect(sim.state.stage).toBe("a");
  });

  it("is evaluated once at entry, not again when the doc changes", () => {
    const sim = createWorkflowSimulator(filteredDef(true), { now: NOW, doc: { sensitive: false } });
    sim.setDoc({ sensitive: true });
    expect(sim.state.activities.legal?.status).toBe("skipped");
  });
});

describe("assignment and availability", () => {
  const def: WorkflowDefinition = {
    name: "assign",
    collections: ["pages"],
    initialStage: "a",
    fields: [{ name: "owner", type: "user", input: true }],
    stages: [
      {
        name: "a",
        activities: [
          {
            name: "pooled",
            assignee: "owner",
            roles: ["editor"],
            actions: [
              { name: "do", status: "done" },
              { name: "legalOnly", roles: ["legal"] },
              { name: "filtered", filter: ({ assigned, roles }) => assigned && roles.length > 1 },
            ],
          },
          { name: "open", actions: [{ name: "do", status: "done" }] },
          { name: "byField", assignee: "owner", actions: [{ name: "do", status: "done" }] },
        ],
        transitions: [{ name: "next", to: "b" }],
      },
      { name: "b" },
    ],
  };
  const allowed = (state: InstanceState, who: Caller, activity: string, action: string) =>
    view(def, state, who, env())
      .activities.find((a) => a.name === activity)
      ?.actions.find((a) => a.name === action)?.allowed;

  it("pool by role when the assignee field is empty; everyone when neither is declared", () => {
    const { state } = start(def, { actor: { system: true } }, env());
    expect(allowed(state, caller("x", ["editor"]), "pooled", "do")).toBe(true);
    expect(allowed(state, caller("x", []), "pooled", "do")).toBe(false);
    expect(allowed(state, caller("x", []), "open", "do")).toBe(true);
    expect(allowed(state, caller("x", []), "byField", "do")).toBe(true);
  });

  it("a held assignee shadows the pool", () => {
    const { state } = start(def, { actor: { system: true }, fields: { owner: "u1" } }, env());
    expect(allowed(state, caller("u1", []), "pooled", "do")).toBe(true);
    expect(allowed(state, caller("u2", ["editor"]), "pooled", "do")).toBe(false);
    expect(allowed(state, caller("u2", []), "byField", "do")).toBe(false);
    const v = view(def, state, caller("u2", ["editor"]), env());
    expect(v.activities[0]?.assignee).toBe("u1");
    expect(v.waitingOn).toEqual({ users: ["u1"], roles: [] });
  });

  it("action roles and filter narrow the default, never widen it", () => {
    const { state } = start(def, { actor: { system: true } }, env());
    expect(allowed(state, caller("x", ["legal"]), "pooled", "legalOnly")).toBe(false);
    expect(allowed(state, caller("x", ["editor"]), "pooled", "legalOnly")).toBe(false);
    expect(allowed(state, caller("x", ["editor", "legal"]), "pooled", "legalOnly")).toBe(true);
    expect(allowed(state, caller("x", ["editor"]), "pooled", "filtered")).toBe(false);
    expect(allowed(state, caller("x", ["editor", "y"]), "pooled", "filtered")).toBe(true);
  });

  it("waitingOn lists roles of unheld activities and drops resolved ones", () => {
    const { state } = start(def, { actor: { system: true } }, env());
    expect(view(def, state, caller("x"), env()).waitingOn).toEqual({
      users: [],
      roles: ["editor"],
    });
    const after = fire(
      def,
      state,
      { activity: "pooled", action: "do" },
      caller("x", ["editor"]),
      env()
    );
    expect(view(def, after.state, caller("x"), env()).waitingOn).toEqual({ users: [], roles: [] });
  });
});

describe("fire rejections", () => {
  const base = () => start(editorialReview, { actor: { system: true } }, env()).state;
  const inReview = () =>
    fire(editorialReview, base(), { activity: "drafting", action: "submit" }, caller("a"), env())
      .state;

  it("instance-not-active", () => {
    const aborted = abort(base(), { actor: { system: true } }, env()).state;
    expect(
      codeOf(() =>
        fire(
          editorialReview,
          aborted,
          { activity: "drafting", action: "submit" },
          caller("a"),
          env()
        )
      )
    ).toBe("instance-not-active");
  });

  it("unknown-stage when the definition changed under the instance", () => {
    const stuck = { ...base(), stage: "gone" };
    expect(
      codeOf(() =>
        fire(editorialReview, stuck, { activity: "drafting", action: "submit" }, caller("a"), env())
      )
    ).toBe("unknown-stage");
    const v = view(editorialReview, stuck, caller("a"), env());
    expect(v.stuck).toBe("unknown-stage");
    expect(v.activities).toEqual([]);
    expect(settle(editorialReview, stuck, env()).state).toBe(stuck);
    expect(abort(stuck, { actor: { system: true } }, env()).state.status).toBe("aborted");
  });

  it("unknown-activity, unknown-action, not-callable", () => {
    const state = inReview();
    expect(
      codeOf(() =>
        fire(editorialReview, state, { activity: "nope", action: "x" }, caller("a"), env())
      )
    ).toBe("unknown-activity");
    expect(
      codeOf(() =>
        fire(editorialReview, state, { activity: "review", action: "nope" }, caller("a"), env())
      )
    ).toBe("unknown-action");
    expect(
      codeOf(() =>
        fire(editorialReview, state, { activity: "review", action: "reset" }, caller("a"), env())
      )
    ).toBe("not-callable");
  });

  it("fires on the stage's only activity when none is named; asks for one when there are several", () => {
    const state = fire(editorialReview, base(), { action: "submit" }, caller("a"), env()).state;
    expect(state.stage).toBe("review");
    const two = filteredDef(true);
    const begun = start(two, { actor: { system: true } }, env({ doc: { sensitive: true } })).state;
    const error = (() => {
      try {
        fire(two, begun, { action: "ok" }, caller("a"), env());
      } catch (caught) {
        return caught as WorkflowError;
      }
    })();
    expect(error?.code).toBe("unknown-activity");
    expect(error?.message).toBe(
      'Stage "a" has several activities ("legal", "copy"); name the activity to fire on.'
    );
  });

  it("activity-not-active", () => {
    const def: WorkflowDefinition = {
      name: "two",
      collections: ["pages"],
      initialStage: "a",
      stages: [
        {
          name: "a",
          activities: [
            { name: "x", actions: [{ name: "ok", status: "done" }] },
            { name: "y", actions: [{ name: "ok", status: "done" }] },
          ],
          transitions: [{ name: "next", to: "b" }],
        },
        { name: "b" },
      ],
    };
    const once = fire(
      def,
      start(def, { actor: { system: true } }, env()).state,
      { activity: "x", action: "ok" },
      caller("a"),
      env()
    );
    expect(
      codeOf(() => fire(def, once.state, { activity: "x", action: "ok" }, caller("a"), env()))
    ).toBe("activity-not-active");
  });

  it("not-allowed", () => {
    const state = inReview();
    const error = (() => {
      try {
        fire(editorialReview, state, { activity: "review", action: "approve" }, caller("a"), env());
      } catch (caught) {
        return caught as WorkflowError;
      }
      return null;
    })();
    expect(error?.code).toBe("not-allowed");
    expect(error?.message).toBe('Requires one of the roles "editor".');
  });

  it("invalid-params: missing required, wrong type, undeclared", () => {
    const state = inReview();
    const ed = caller("e", ["editor"]);
    expect(
      codeOf(() =>
        fire(editorialReview, state, { activity: "review", action: "reject" }, ed, env())
      )
    ).toBe("invalid-params");
    expect(
      codeOf(() =>
        fire(
          editorialReview,
          state,
          { activity: "review", action: "reject", params: { reason: 3 } },
          ed,
          env()
        )
      )
    ).toBe("invalid-params");
    expect(
      codeOf(() =>
        fire(
          editorialReview,
          state,
          { activity: "review", action: "approve", params: { extra: 1 } },
          ed,
          env()
        )
      )
    ).toBe("invalid-params");
  });

  it("checks in the documented order: not-allowed before invalid-params", () => {
    const state = inReview();
    expect(
      codeOf(() =>
        fire(editorialReview, state, { activity: "review", action: "reject" }, caller("a"), env())
      )
    ).toBe("not-allowed");
  });

  it("invalid-patch when a set function writes an undeclared field", () => {
    const def: WorkflowDefinition = {
      name: "bad-set",
      collections: ["pages"],
      initialStage: "a",
      stages: [
        {
          name: "a",
          activities: [
            { name: "w", actions: [{ name: "ok", status: "done", set: () => ({ nope: 1 }) }] },
          ],
          transitions: [{ name: "n", to: "b" }],
        },
        { name: "b" },
      ],
    };
    const state = start(def, { actor: { system: true } }, env()).state;
    expect(
      codeOf(() => fire(def, state, { activity: "w", action: "ok" }, caller("a"), env()))
    ).toBe("invalid-patch");
  });

  it("condition-error when a condition throws; nothing changes", () => {
    const def: WorkflowDefinition = {
      name: "throws",
      collections: ["pages"],
      initialStage: "a",
      stages: [
        {
          name: "a",
          activities: [{ name: "w", actions: [{ name: "ok", status: "done" }] }],
          transitions: [
            {
              name: "n",
              to: "b",
              when: ({ activities }) => {
                if (activities.w === "done") {
                  throw new Error("boom");
                }
                return false;
              },
            },
          ],
        },
        { name: "b" },
      ],
    };
    const state = start(def, { actor: { system: true } }, env()).state;
    const before = structuredClone(state);
    expect(
      codeOf(() => fire(def, state, { activity: "w", action: "ok" }, caller("a"), env()))
    ).toBe("condition-error");
    expect(state).toEqual(before);
  });
});

describe("params", () => {
  const def: WorkflowDefinition = {
    name: "params",
    collections: ["pages"],
    initialStage: "a",
    fields: [{ name: "out", type: "json" }],
    stages: [
      {
        name: "a",
        activities: [
          {
            name: "w",
            actions: [
              {
                name: "go",
                status: "done",
                params: [
                  { name: "n", type: "number" },
                  { name: "b", type: "boolean" },
                  { name: "d", type: "date" },
                  { name: "s", type: "select", options: ["x", { label: "Why", value: "y" }] },
                ],
                set: ({ params }) => ({ out: params }),
              },
            ],
          },
        ],
        transitions: [{ name: "n", to: "b" }],
      },
      { name: "b" },
    ],
  };
  const go = (params: Record<string, unknown>) =>
    codeOf(() =>
      fire(
        def,
        start(def, { actor: { system: true } }, env()).state,
        { activity: "w", action: "go", params },
        caller("a"),
        env()
      )
    );

  it("accepts every type", () => {
    expect(go({ n: 1, b: false, d: "2026-01-02", s: "y" })).toBeUndefined();
    const result = fire(
      def,
      start(def, { actor: { system: true } }, env()).state,
      { activity: "w", action: "go", params: { n: 1, s: "x", d: "" } },
      caller("a"),
      env()
    );
    expect(result.state.fields.out).toEqual({ n: 1, s: "x" });
  });

  it.each([
    [{ n: "1" }],
    [{ n: Number.NaN }],
    [{ b: "true" }],
    [{ d: "not a date" }],
    [{ s: "z" }],
  ])("rejects %j", (params) => {
    expect(go(params)).toBe("invalid-params");
  });
});

describe("view and fire agree", () => {
  it("every action shown allowed fires, every action shown disallowed is refused", () => {
    const callers = [
      caller("u-editor", ["editor"]),
      caller("u-other", ["editor"]),
      caller("nobody"),
      caller("u-author"),
    ];
    const states: InstanceState[] = [];
    const sim = createWorkflowSimulator(editorialReview, { now: NOW });
    states.push(sim.state);
    sim.fire("submit", author);
    states.push(sim.state);
    sim.fire("claim", editor);
    states.push(sim.state);
    states.push(abort(sim.state, { actor: { system: true } }, env()).state);
    let checked = 0;
    for (const state of states) {
      for (const who of callers) {
        const v = view(editorialReview, state, who, env());
        for (const activity of v.activities) {
          for (const action of activity.actions) {
            const params = action.params.length > 0 ? { reason: "because" } : undefined;
            const code = codeOf(() =>
              fire(
                editorialReview,
                state,
                { activity: activity.name, action: action.name, params },
                who,
                env()
              )
            );
            expect(code === undefined, `${activity.name}/${action.name} for ${who.actor.id}`).toBe(
              action.allowed
            );
            if (!action.allowed) {
              expect(action.reason).toBeTruthy();
            }
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe("guards", () => {
  it("are listed only while the instance holds in their stage", () => {
    const sim = createWorkflowSimulator(editorialReview, { now: NOW });
    expect(sim.view().guards).toEqual([]);
    sim.fire("submit", author);
    expect(sim.view().guards).toEqual([
      {
        name: "hold-publish",
        title: "Publishing is held until review is approved",
        operations: ["publish"],
      },
    ]);
    sim.fire("approve", editor);
    expect(sim.view().guards).toEqual([]);
  });

  it("an `unless` that is true lifts the guard; one that throws keeps it", () => {
    expect(createWorkflowSimulator(guardedDef(() => true)).view().guards).toEqual([]);
    expect(
      createWorkflowSimulator(
        guardedDef(() => {
          throw new Error("x");
        })
      ).view().guards
    ).toHaveLength(1);
  });

  it("are not listed for an aborted instance", () => {
    const sim = createWorkflowSimulator(editorialReview, { now: NOW });
    sim.fire("submit", author);
    sim.abort("stop");
    expect(sim.view().guards).toEqual([]);
  });
});

describe("cascade limit", () => {
  it("throws cascade-limit on a definition that loops forever", () => {
    const def: WorkflowDefinition = {
      name: "loop",
      collections: ["pages"],
      initialStage: "a",
      stages: [
        { name: "a", transitions: [{ name: "go", to: "b", when: () => true }] },
        { name: "b", transitions: [{ name: "back", to: "a", when: () => true }] },
      ],
    };
    expect(codeOf(() => start(def, { actor: { system: true } }, env()))).toBe("cascade-limit");
    expect(CASCADE_LIMIT).toBe(50);
  });
});

describe("now-based conditions via settle", () => {
  const def: WorkflowDefinition = {
    name: "timer",
    collections: ["pages"],
    initialStage: "waiting",
    fields: [{ name: "due", type: "date", initialValue: "2026-01-02T00:00:00.000Z" }],
    stages: [
      {
        name: "waiting",
        transitions: [
          {
            name: "expire",
            to: "expired",
            when: ({ fields, now }) => now >= new Date(String(fields.due)),
          },
        ],
      },
      { name: "expired" },
    ],
  };

  it("does nothing before the time, returning the same reference, and moves after", () => {
    const { state } = start(def, { actor: { system: true } }, env());
    const same = settle(def, state, env());
    expect(same.state).toBe(state);
    const later = settle(def, state, env({ now: new Date("2026-01-03T00:00:00.000Z") }));
    expect(later.state.stage).toBe("expired");
    expect(later.state.status).toBe("completed");
  });

  it("via the simulator's advance", () => {
    const sim = createWorkflowSimulator(def, { now: NOW });
    sim.advance(new Date("2026-01-05T00:00:00.000Z"));
    expect(sim.state.status).toBe("completed");
  });
});

describe("doc-based conditions", () => {
  it("settle with a fresh doc moves the run", () => {
    const def: WorkflowDefinition = {
      name: "pub",
      collections: ["pages"],
      initialStage: "a",
      stages: [
        {
          name: "a",
          transitions: [{ name: "pub", to: "b", when: ({ doc }) => doc?._status === "published" }],
        },
        { name: "b" },
      ],
    };
    const sim = createWorkflowSimulator(def, { doc: { _status: "draft" } });
    expect(sim.state.stage).toBe("a");
    sim.setDoc({ _status: "published" });
    expect(sim.state.status).toBe("completed");
  });
});

describe("patchFields", () => {
  it("writes declared fields, unsets with null, and settles", () => {
    const sim = createWorkflowSimulator(editorialReview, { now: NOW });
    sim.fire("submit", author);
    sim.patch({ reviewer: "u-bot" });
    expect(sim.state.fields.reviewer).toBe("u-bot");
    sim.patch({ decision: "approved" });
    expect(sim.state.status).toBe("completed");
  });

  it("rejects undeclared fields and inactive instances", () => {
    const { state } = start(editorialReview, { actor: { system: true } }, env());
    expect(codeOf(() => patchFields(editorialReview, state, { nope: 1 }, env()))).toBe(
      "invalid-patch"
    );
    const aborted = abort(state, { actor: { system: true } }, env()).state;
    expect(codeOf(() => patchFields(editorialReview, aborted, { reviewer: "x" }, env()))).toBe(
      "instance-not-active"
    );
  });
});

describe("start", () => {
  const startable: WorkflowDefinition = {
    ...editorialReview,
    fields: [
      { name: "reviewer", type: "user", input: true },
      { name: "decision", type: "string" },
      { name: "reason", type: "text" },
      { name: "priority", type: "number", initialValue: 3 },
    ],
  };

  it("applies initial values then provided fields, and rejects undeclared ones", () => {
    expect(
      start(startable, { actor: { system: true }, fields: { reviewer: "u1" } }, env()).state.fields
    ).toEqual({
      priority: 3,
      reviewer: "u1",
    });
    expect(
      codeOf(() => start(startable, { actor: { system: true }, fields: { nope: 1 } }, env()))
    ).toBe("invalid-patch");
  });

  it("accepts only fields declared with `input: true` from the caller; initialValue seeds any", () => {
    for (const fields of [
      { decision: "approved" },
      { priority: 1 },
      { reviewer: "u1", reason: "x" },
    ]) {
      expect(codeOf(() => start(startable, { actor: { system: true }, fields }, env()))).toBe(
        "invalid-patch"
      );
    }
    // The editorial review declares no input field: a caller cannot pre-approve it.
    expect(
      codeOf(() =>
        start(editorialReview, { actor: { system: true }, fields: { decision: "approved" } }, env())
      )
    ).toBe("invalid-patch");
    expect(start(startable, { actor: { system: true } }, env()).state.fields).toEqual({
      priority: 3,
    });
  });

  it("type-checks input fields", () => {
    expect(
      codeOf(() => start(startable, { actor: { system: true }, fields: { reviewer: {} } }, env()))
    ).toBe("invalid-patch");
    expect(
      start(startable, { actor: { system: true }, fields: { reviewer: 7 } }, env()).state.fields
        .reviewer
    ).toBe("7");
  });

  it("an initialValue function seeds from who starts it and the document, type-checked", () => {
    const owned: WorkflowDefinition = {
      ...editorialReview,
      fields: [
        { name: "author", type: "user", initialValue: ({ actor }) => actor.id },
        { name: "headline", type: "string", initialValue: ({ doc }) => doc?.title },
      ],
    };
    const ann = { id: "u-ann", via: "admin" } as const;
    expect(start(owned, { actor: ann }, env({ doc: { title: "Hi" } })).state.fields).toEqual({
      author: "u-ann",
      headline: "Hi",
    });
    // Started by the system (auto-start): no user, so the field stays unset.
    expect(start(owned, { actor: { system: true } }, env()).state.fields).toEqual({});
    const wrong: WorkflowDefinition = {
      ...editorialReview,
      fields: [{ name: "author", type: "user", initialValue: () => ({ not: "a user" }) }],
    };
    expect(codeOf(() => start(wrong, { actor: ann }, env()))).toBe("invalid-patch");
    const throws: WorkflowDefinition = {
      ...editorialReview,
      fields: [
        {
          name: "author",
          type: "user",
          initialValue: () => {
            throw new Error("boom");
          },
        },
      ],
    };
    expect(codeOf(() => start(throws, { actor: ann }, env()))).toBe("condition-error");
  });

  it("records who started it, from which definition version, and numbers its events from 1", () => {
    const { state, events } = start(editorialReview, { actor: { id: "u1", via: "admin" } }, env());
    expect(events[0]).toEqual({
      seq: 1,
      at: NOW.toISOString(),
      actor: { id: "u1", via: "admin" },
      type: "started",
      stage: "drafting",
      definitionVersion: editorialReview.version,
    });
    expect(state.startedAt).toBe(NOW.toISOString());
    expect(state.startedBy).toEqual({ id: "u1", via: "admin" });
    expect(state.definitionVersion).toBe(editorialReview.version);
    expect(state).toMatchObject({ visit: 0, visited: ["drafting"], nextSeq: events.length + 1 });
  });
});

describe("abort", () => {
  it("ends the run with a reason and cannot abort twice", () => {
    const { state } = start(editorialReview, { actor: { system: true } }, env());
    const result = abort(state, { reason: "Subject deleted", actor: { system: true } }, env());
    const aborted = result.state;
    expect(aborted.status).toBe("aborted");
    expect(aborted.completedAt).toBe(NOW.toISOString());
    expect(result.events).toEqual([
      expect.objectContaining({
        seq: state.nextSeq,
        type: "aborted",
        stage: "drafting",
        reason: "Subject deleted",
      }),
    ]);
    expect(codeOf(() => abort(aborted, { actor: { system: true } }, env()))).toBe(
      "instance-not-active"
    );
  });
});

describe("immutability", () => {
  it("never mutates the input state", () => {
    const { state } = start(editorialReview, { actor: { system: true } }, env());
    const frozen = structuredClone(state);
    const review = fire(
      editorialReview,
      state,
      { activity: "drafting", action: "submit" },
      caller("a"),
      env()
    ).state;
    expect(state).toEqual(frozen);
    const reviewCopy = structuredClone(review);
    fire(
      editorialReview,
      review,
      { activity: "review", action: "claim" },
      caller("e", ["editor"]),
      env()
    );
    fire(
      editorialReview,
      review,
      { activity: "review", action: "reject", params: { reason: "r" } },
      caller("e", ["editor"]),
      env()
    );
    patchFields(editorialReview, review, { decision: "approved" }, env());
    abort(review, { actor: { system: true } }, env());
    settle(editorialReview, review, env({ now: new Date() }));
    view(editorialReview, review, caller("e", ["editor"]), env()).fields.decision = "mutated";
    expect(review).toEqual(reviewCopy);
  });
});

describe("field types", () => {
  const typed: WorkflowDefinition = {
    name: "typed",
    collections: ["pages"],
    initialStage: "a",
    fields: [
      { name: "s", type: "string" },
      { name: "t", type: "text" },
      { name: "n", type: "number" },
      { name: "b", type: "boolean" },
      { name: "d", type: "date" },
      { name: "u", type: "user" },
      { name: "j", type: "json" },
    ],
    stages: [
      {
        name: "a",
        activities: [
          {
            name: "work",
            actions: [
              { name: "finish", status: "done" },
              {
                name: "write",
                params: [{ name: "value", type: "text" }],
                set: ({ params }) => ({ n: params.value }),
              },
            ],
          },
        ],
        transitions: [{ name: "next", to: "b" }],
      },
      { name: "b" },
    ],
  };
  const base = () => start(typed, { actor: { system: true } }, env()).state;
  const patchCode = (patch: Record<string, unknown>) =>
    codeOf(() => patchFields(typed, base(), patch, env()));

  it("accepts a value of each type and stores a numeric user id as a string", () => {
    const { state } = patchFields(
      typed,
      base(),
      {
        s: "a",
        t: "long",
        n: 1.5,
        b: false,
        d: "2026-01-01T00:00:00.000Z",
        u: 42,
        j: { nested: [1, "x", null] },
      },
      env()
    );
    expect(state.fields).toEqual({
      s: "a",
      t: "long",
      n: 1.5,
      b: false,
      d: "2026-01-01T00:00:00.000Z",
      u: "42",
      j: { nested: [1, "x", null] },
    });
    expect(
      patchFields(typed, state, { s: null, u: undefined }, env()).state.fields
    ).not.toHaveProperty("s");
  });

  it.each([
    [{ s: 1 }],
    [{ t: false }],
    [{ n: "1" }],
    [{ n: Number.NaN }],
    [{ n: Number.POSITIVE_INFINITY }],
    [{ b: "true" }],
    [{ d: "not a date" }],
    [{ d: 1_700_000_000_000 }],
    [{ u: { id: 1 } }],
    [{ j: () => 1 }],
    [{ j: 10n }],
  ])("rejects %o as invalid-patch, naming the field", (patch) => {
    expect(patchCode(patch)).toBe("invalid-patch");
    const name = Object.keys(patch)[0] as string;
    expect(() => patchFields(typed, base(), patch, env())).toThrow(`field "${name}"`);
  });

  it("checks an action's set too", () => {
    expect(
      codeOf(() =>
        fire(
          typed,
          base(),
          { activity: "work", action: "write", params: { value: "x" } },
          caller("u"),
          env()
        )
      )
    ).toBe("invalid-patch");
  });
});

describe("definition drift", () => {
  const before: WorkflowDefinition = {
    name: "drift",
    collections: ["pages"],
    initialStage: "a",
    stages: [
      {
        name: "a",
        activities: [
          { name: "keep", actions: [{ name: "do", status: "done" }] },
          { name: "gone", actions: [{ name: "do", status: "done" }] },
        ],
        transitions: [{ name: "next", to: "b" }],
      },
      { name: "b" },
    ],
  };

  it("an activity removed from code no longer blocks the default transition", () => {
    const entered = start(before, { actor: { system: true } }, env()).state;
    const after: WorkflowDefinition = {
      ...before,
      stages: [
        {
          ...(before.stages[0] as StageDef),
          activities: [before.stages[0]?.activities?.[0] as ActivityDef],
        },
        { name: "b" },
      ],
    };
    const moved = fire(after, entered, { activity: "keep", action: "do" }, caller("u"), env());
    expect(moved.state.status).toBe("completed");
  });

  it("an activity added after stage entry is active, actionable and waited on", () => {
    const withRoles: WorkflowDefinition = {
      ...before,
      stages: [
        {
          ...(before.stages[0] as StageDef),
          activities: [before.stages[0]?.activities?.[0] as ActivityDef],
        },
        { name: "b" },
      ],
    };
    const entered = start(withRoles, { actor: { system: true } }, env()).state;
    const added: WorkflowDefinition = {
      ...withRoles,
      stages: [
        {
          ...(withRoles.stages[0] as StageDef),
          activities: [
            withRoles.stages[0]?.activities?.[0] as ActivityDef,
            { name: "legal", roles: ["legal"], actions: [{ name: "ok", status: "done" }] },
          ],
        },
        { name: "b" },
      ],
    };
    const done = fire(added, entered, { activity: "keep", action: "do" }, caller("u"), env()).state;
    // Without "legal" counted, finishing "keep" would have completed the run.
    expect(done.status).toBe("active");
    const seen = view(added, done, caller("l", ["legal"]), env());
    expect(seen.activities.find((a) => a.name === "legal")?.status).toBe("active");
    expect(seen.activities.find((a) => a.name === "legal")?.actions[0]?.allowed).toBe(true);
    expect(seen.waitingOn.roles).toEqual(["legal"]);
    const finished = fire(
      added,
      done,
      { activity: "legal", action: "ok" },
      caller("l", ["legal"]),
      env()
    );
    expect(finished.state.status).toBe("completed");
  });

  it("an auto action of an added activity fires", () => {
    const entered = start(before, { actor: { system: true } }, env()).state;
    const added: WorkflowDefinition = {
      ...before,
      stages: [
        {
          ...(before.stages[0] as StageDef),
          activities: [
            ...(before.stages[0]?.activities ?? []),
            { name: "auto", actions: [{ name: "go", when: () => true, status: "done" }] },
          ],
        },
        { name: "b" },
      ],
    };
    expect(settle(added, entered, env()).state.activities.auto?.status).toBe("done");
  });
});

describe("params read own properties only", () => {
  it("does not read Object.prototype members as param values", () => {
    expect(
      validateParams(
        [
          { name: "toString", type: "string" },
          { name: "constructor", type: "string" },
        ],
        {}
      )
    ).toEqual({});
    expect(
      codeOf(() => validateParams([{ name: "valueOf", type: "string", required: true }], {}))
    ).toBe("invalid-params");
  });
});

describe("why an action is not allowed (reasonCode)", () => {
  it("tells the action's own filter apart from assignment and roles", () => {
    const sim = createWorkflowSimulator(editorialReview, { now: NOW });
    sim.fire("submit", author);
    sim.fire("claim", editor);
    const actions = (who: { user: string; roles: string[] }) =>
      Object.fromEntries(
        sim.view(who).activities[0]?.actions.map((a) => [a.name, a.reasonCode ?? "allowed"]) ?? []
      );
    expect(actions(editor)).toEqual({ claim: "filter", approve: "allowed", reject: "allowed" });
    expect(actions(otherEditor)).toEqual({
      claim: "assignment",
      approve: "assignment",
      reject: "assignment",
    });
  });
});

describe("mayAbort: stopping is not a way around a hold", () => {
  const inReview = () => {
    const sim = createWorkflowSimulator(editorialReview);
    sim.fire("submit", { user: author.user });
    sim.fire("claim", editor);
    return sim.state;
  };

  it("while a guard holds, only someone who may act in the stage", () => {
    const state = inReview();
    expect(mayAbort(editorialReview, state, caller(editor.user, editor.roles), env())).toBe(true);
    expect(mayAbort(editorialReview, state, caller(author.user), env())).toBe(false);
    // Another editor: the review is taken, so they may not act either.
    expect(mayAbort(editorialReview, state, caller("u-other", ["editor"]), env())).toBe(false);
  });

  it("anyone when no guard holds or the run is stuck; nobody once it is over", () => {
    const drafting = createWorkflowSimulator(editorialReview).state;
    expect(mayAbort(editorialReview, drafting, caller("u-anyone"), env())).toBe(true);
    const stuck = { ...inReview(), stage: "gone" };
    expect(mayAbort(editorialReview, stuck, caller("u-anyone"), env())).toBe(true);
    const over = abort(inReview(), { actor: { system: true } }, env()).state;
    expect(mayAbort(editorialReview, over, caller(editor.user, editor.roles), env())).toBe(false);
  });
});

describe("holdMessage", () => {
  it("leads with what is on hold, then the guard's title", () => {
    expect(holdMessage(["publish"], "A reviewer must approve this page first.")).toBe(
      "Publishing is on hold. A reviewer must approve this page first."
    );
    expect(holdMessage(["publish", "update", "delete"])).toBe(
      "Publishing, saving and deleting are on hold until this stage is done."
    );
  });
});

const approve = (sim: ReturnType<typeof createWorkflowSimulator>, user: string) =>
  sim.view({ user, roles: ["editor"] }).activities[0]?.actions[0]?.allowed;

describe("a numeric user id holds an assignment (fails closed)", () => {
  // The probe: the reviewer comes from the document's numeric owner id, and a caller-supplied
  // start field must not throw that normalised value away.
  const owned: WorkflowDefinition = defineWorkflow({
    name: "owned",
    collections: ["pages"],
    initialStage: "review",
    fields: [
      { name: "reviewer", type: "user", initialValue: ({ doc }) => doc?.owner },
      { name: "note", type: "string", input: true },
    ],
    stages: [
      {
        name: "review",
        assignee: "reviewer",
        roles: ["editor"],
        actions: [{ name: "approve", status: "done" }],
        transitions: [{ name: "t", to: "done" }],
      },
      { name: "done" },
    ],
  });

  it("keeps the normalised initial value when start fields are passed too", () => {
    const plain = createWorkflowSimulator(owned, { doc: { owner: 7 } });
    const withInput = createWorkflowSimulator(owned, { doc: { owner: 7 }, fields: { note: "x" } });
    for (const sim of [plain, withInput]) {
      expect(sim.state.fields.reviewer).toBe("7");
      expect(approve(sim, "999")).toBe(false);
      expect(approve(sim, "7")).toBe(true);
      expect(sim.view().waitingOn).toEqual({ users: ["7"], roles: [] });
    }
    expect(withInput.state.fields.note).toBe("x");
  });

  it("treats any non-empty stored value as held, compared as a string", () => {
    const sim = createWorkflowSimulator(owned);
    // As if stored before ids were normalised: a raw number in the run's fields.
    const state: InstanceState = { ...sim.state, fields: { reviewer: 7 } };
    const allowed = (id: string) =>
      view(owned, state, caller(id, ["editor"]), env()).activities[0]?.actions[0]?.allowed;
    expect(allowed("7")).toBe(true);
    expect(allowed("999")).toBe(false);
    expect(
      codeOf(() => fire(owned, state, { action: "approve" }, caller("999", ["editor"]), env()))
    ).toBe("not-allowed");
    // Unset (or empty) holds nothing: the role pool decides.
    const open: InstanceState = { ...sim.state, fields: { reviewer: "" } };
    expect(
      view(owned, open, caller("999", ["editor"]), env()).activities[0]?.actions[0]?.allowed
    ).toBe(true);
  });
});

describe("an effect's outcome (recordEffect)", () => {
  // `check` queues `verify` in `review`; its `{ set }` decides the review.
  const checked: WorkflowDefinition = defineWorkflow({
    name: "checked",
    collections: ["pages"],
    initialStage: "drafting",
    fields: [{ name: "verdict", type: "string" }],
    stages: [
      {
        name: "drafting",
        actions: [{ name: "submit", status: "done" }],
        transitions: [{ name: "to-review", to: "review" }],
      },
      {
        name: "review",
        actions: [
          { name: "check", effects: ["verify"] },
          { name: "reject", status: "done" },
        ],
        transitions: [
          { name: "pass", to: "passed", when: ({ fields }) => fields.verdict === "pass" },
          { name: "back", to: "drafting" },
        ],
      },
      { name: "passed" },
    ],
  });
  const sys = caller("u1");
  const inReview = () => {
    const started = start(checked, { actor: { system: true } }, env()).state;
    return fire(checked, started, { action: "submit" }, sys, env()).state;
  };
  const pass = { status: "done" as const, set: { verdict: "pass" } };

  it("applies `set` while the run is still in the visit that queued it", () => {
    const queued = fire(checked, inReview(), { action: "check" }, sys, env());
    const [effect] = queued.effects;
    expect(effect).toMatchObject({ name: "verify", stage: "review", visit: 1 });
    const { state, events } = recordEffect(
      checked,
      queued.state,
      { ...effect!, job: "42" },
      pass,
      env()
    );
    expect(state.stage).toBe("passed");
    const done = events.find((entry) => entry.type === "effect" && entry.status === "done");
    expect(done).toMatchObject({ stage: "review", job: "42" });
    expect(done).not.toHaveProperty("stale");
  });

  it("ignores `set` once the run was sent back before the effect ran, and says so", () => {
    const queued = fire(checked, inReview(), { action: "check" }, sys, env());
    const back = fire(checked, queued.state, { action: "reject" }, sys, env()).state;
    expect(back.stage).toBe("drafting");
    const { state, events } = recordEffect(checked, back, queued.effects[0]!, pass, env());
    expect(state.stage).toBe("drafting");
    expect(state.fields.verdict).toBeUndefined();
    expect(events.at(-1)).toMatchObject({ type: "effect", status: "done", stale: true });
  });

  it("ignores `set` from an earlier visit of the same stage (a loop back)", () => {
    const queued = fire(checked, inReview(), { action: "check" }, sys, env());
    const back = fire(checked, queued.state, { action: "reject" }, sys, env()).state;
    const again = fire(checked, back, { action: "submit" }, sys, env()).state;
    expect(again.stage).toBe("review");
    const { state, events } = recordEffect(checked, again, queued.effects[0]!, pass, env());
    expect(state.stage).toBe("review");
    expect(state.fields.verdict).toBeUndefined();
    expect(events.at(-1)).toMatchObject({ stale: true });
  });

  it("records an outcome without `set` plainly, whatever the run did since", () => {
    const queued = fire(checked, inReview(), { action: "check" }, sys, env());
    const back = fire(checked, queued.state, { action: "reject" }, sys, env()).state;
    const done = recordEffect(checked, back, queued.effects[0]!, { status: "done" }, env());
    expect(done.events.at(-1)).not.toHaveProperty("stale");
    expect(done.state.nextSeq).toBe(back.nextSeq + 1);
  });
});

describe("the view's history", () => {
  it("carries the most recent entries, how many are older, and who started the run", () => {
    const sim = createWorkflowSimulator(editorialReview);
    sim.fire("submit", author);
    sim.fire("claim", editor);
    for (let round = 0; round < 15; round += 1) {
      sim.fire("reject", { ...editor, params: { reason: "again" } });
      sim.fire("submit", author);
    }
    const total = sim.events.length;
    expect(total).toBeGreaterThan(HISTORY_IN_VIEW);
    expect(sim.events.map((entry) => entry.seq)).toEqual(
      Array.from({ length: total }, (_, i) => i + 1)
    );
    const projected = sim.view();
    expect(projected.history).toEqual(sim.events.slice(-HISTORY_IN_VIEW));
    expect(projected.olderHistory).toBe(total - HISTORY_IN_VIEW);
    expect(projected.started).toEqual({ at: sim.state.startedAt, actor: { system: true } });
  });
});

const states = (sim: ReturnType<typeof createWorkflowSimulator>) =>
  Object.fromEntries(sim.view().stages.map((stage) => [stage.name, stage.state]));

describe("stage states follow what happened, not declaration order", () => {
  // `a` branches to `b` or `c`; both lead to `d`. Declared a, b, c, d.
  const branching = defineWorkflow({
    name: "branching",
    collections: ["pages"],
    initialStage: "a",
    stages: [
      {
        name: "a",
        actions: [
          { name: "left", status: "done", set: { way: "b" } },
          { name: "right", status: "done", set: { way: "c" } },
        ],
        transitions: [
          { name: "to-b", to: "b", when: ({ fields }) => fields.way === "b" },
          { name: "to-c", to: "c", when: ({ fields }) => fields.way === "c" },
        ],
      },
      {
        name: "b",
        actions: [{ name: "go", status: "done" }],
        transitions: [{ name: "to-d", to: "d" }],
      },
      {
        name: "c",
        actions: [
          { name: "go", status: "done" },
          { name: "back", status: "done", set: { way: "a" } },
        ],
        transitions: [
          { name: "loop", to: "a", when: ({ fields }) => fields.way === "a" },
          { name: "to-d", to: "d" },
        ],
      },
      { name: "d", title: "Done" },
    ],
    fields: [{ name: "way", type: "string" }],
  });
  it("marks the current stage, the stages entered, and leaves a skipped branch unvisited", () => {
    const sim = createWorkflowSimulator(branching);
    expect(states(sim)).toEqual({ a: "current", b: "unvisited", c: "unvisited", d: "unvisited" });
    sim.fire("right");
    expect(states(sim)).toEqual({ a: "visited", b: "unvisited", c: "current", d: "unvisited" });
    sim.fire("go");
    expect(sim.state.status).toBe("completed");
    expect(states(sim)).toEqual({ a: "visited", b: "unvisited", c: "visited", d: "current" });
    expect(sim.state.visited).toEqual(["a", "c", "d"]);
  });

  it("counts every visit, a loop back included, and lists each stage once", () => {
    const sim = createWorkflowSimulator(branching);
    sim.fire("right");
    sim.fire("back");
    expect(sim.state.stage).toBe("a");
    expect(sim.state.visit).toBe(2);
    expect(states(sim)).toEqual({ a: "current", b: "unvisited", c: "visited", d: "unvisited" });
    sim.fire("left");
    expect(sim.state.visit).toBe(3);
    expect(sim.state.visited).toEqual(["a", "c", "b"]);
  });
});

describe("what caused the system's entries", () => {
  it("stamps the operation's cause on the system's entries only", () => {
    const sim = createWorkflowSimulator(editorialReview);
    // Auto-started: the system's own entries say so.
    expect(sim.events.every((entry) => entry.cause?.kind === "start")).toBe(true);
    sim.fire("submit", author);
    const fired = sim.events.slice(-3);
    // The person's step carries no cause; what it set off is caused by it.
    expect(fired.map((entry) => [entry.type, entry.actor.id, entry.cause?.kind])).toEqual([
      ["action", "u-author", undefined],
      ["transition", undefined, "step"],
      ["action", undefined, "step"],
    ]);
  });

  it("passes a save's and the clock's cause through settle", () => {
    const def = defineWorkflow({
      name: "doc-driven",
      collections: ["pages"],
      initialStage: "a",
      stages: [
        {
          name: "a",
          transitions: [{ name: "go", to: "b", when: ({ doc }) => doc?.ready === true }],
        },
        { name: "b" },
      ],
    });
    const { state } = start(def, { actor: { system: true } }, env());
    const by = { id: "u9" };
    const saved = settle(def, state, env({ doc: { ready: true }, cause: { kind: "save", by } }));
    expect(saved.events.map((entry) => entry.cause)).toEqual([
      { kind: "save", by },
      { kind: "save", by },
    ]);
    expect(settle(def, state, env()).events).toEqual([]);
  });
});

describe("bounded free text", () => {
  const noted = defineWorkflow({
    name: "noted",
    collections: ["pages"],
    initialStage: "a",
    stages: [
      {
        name: "a",
        actions: [
          {
            name: "note",
            params: [
              { name: "text", type: "text" },
              { name: "short", type: "string", maxLength: 5 },
            ],
          },
          { name: "done", status: "done" },
        ],
        transitions: [{ name: "next", to: "b" }],
      },
      { name: "b" },
    ],
  });

  it("refuses a text or string param longer than its maxLength (default TEXT_MAX_LENGTH)", () => {
    const sim = createWorkflowSimulator(noted);
    expect(() => sim.fire("note", { params: { text: "x".repeat(TEXT_MAX_LENGTH) } })).not.toThrow();
    expect(
      codeOf(() => sim.fire("note", { params: { text: "x".repeat(TEXT_MAX_LENGTH + 1) } }))
    ).toBe("invalid-params");
    expect(codeOf(() => sim.fire("note", { params: { short: "123456" } }))).toBe("invalid-params");
    expect(() => sim.fire("note", { params: { short: "12345" } })).not.toThrow();
  });

  it("refuses a stop reason longer than TEXT_MAX_LENGTH", () => {
    const { state } = start(noted, { actor: { system: true } }, env());
    const actor = { system: true } as const;
    expect(
      codeOf(() => abort(state, { actor, reason: "x".repeat(TEXT_MAX_LENGTH + 1) }, env()))
    ).toBe("invalid-params");
    expect(abort(state, { actor, reason: "x".repeat(TEXT_MAX_LENGTH) }, env()).state.status).toBe(
      "aborted"
    );
  });
});

describe("recordBypass", () => {
  it("adds one numbered entry and changes nothing else", () => {
    const { state } = start(editorialReview, { actor: { system: true } }, env());
    const actor = { id: "u1", via: "admin" } as const;
    const result = recordBypass(
      state,
      { operation: "publish", guards: ["hold-publish"], actor },
      env()
    );
    expect(result.events).toEqual([
      {
        seq: state.nextSeq,
        at: NOW.toISOString(),
        actor,
        type: "guard-bypassed",
        stage: "drafting",
        operation: "publish",
        guards: ["hold-publish"],
      },
    ]);
    expect(result.state).toEqual({ ...state, nextSeq: state.nextSeq + 1 });
  });
});

describe("recordPublish (requiredToPublish)", () => {
  const completed = () => {
    const sim = createWorkflowSimulator(editorialReview);
    sim.fire("submit", author);
    sim.fire("claim", editor);
    sim.fire("approve", editor);
    return sim.state;
  };
  const actor = { id: "u1", via: "admin" } as const;

  it("marks a completed run as used, with one entry", () => {
    const state = completed();
    const result = recordPublish(state, { actor }, env());
    expect(result.state).toEqual({
      ...state,
      publishedAt: NOW.toISOString(),
      nextSeq: state.nextSeq + 1,
    });
    expect(result.events).toEqual([
      { seq: state.nextSeq, at: NOW.toISOString(), actor, type: "published", stage: "approved" },
    ]);
    expect(view(editorialReview, result.state, { actor, roles: [] }, env())).toMatchObject({
      publishedAt: NOW.toISOString(),
    });
  });

  it("refuses a run that is not completed, or already used", () => {
    const { state } = start(editorialReview, { actor: { system: true } }, env());
    expect(() => recordPublish(state, { actor }, env())).toThrowError(
      new WorkflowError("instance-not-active", "The workflow is active, not completed.")
    );
    const used = recordPublish(completed(), { actor }, env()).state;
    expect(() => recordPublish(used, { actor }, env())).toThrowError(
      "This run was already used for a publish."
    );
  });

  it("the view says whether the workflow is required", () => {
    const required = defineWorkflow({ ...editorialReview, requiredToPublish: true });
    const { state } = start(required, { actor: { system: true } }, env());
    expect(view(required, state, { actor, roles: [] }, env()).requiredToPublish).toBe(true);
    expect(view(editorialReview, state, { actor, roles: [] }, env())).not.toHaveProperty(
      "requiredToPublish"
    );
  });
});

describe("titles in the reader's language", () => {
  const localized = defineWorkflow({
    name: "localized",
    title: { en: "Review", de: "Prüfung" },
    collections: ["pages"],
    initialStage: "a",
    stages: [
      {
        name: "a",
        title: { en: "Drafting", de: "Entwurf" },
        description: { en: "Write it", de: "Schreiben" },
        actions: [
          {
            name: "send",
            title: { en: "Send", fr: "Envoyer" },
            status: "done",
            params: [{ name: "why", type: "text", title: { en: "Why", de: "Warum" } }],
          },
        ],
        guards: [{ name: "hold", title: { en: "Wait", de: "Warten" }, operations: ["update"] }],
        transitions: [{ name: "next", to: "b" }],
      },
      { name: "b", title: "Done" },
    ],
  });

  it("resolves them for the language, else English, else the first; plain strings as they are", () => {
    const sim = createWorkflowSimulator(localized);
    const de = sim.view(undefined, "de");
    expect([de.title, de.stage.title, de.stage.description, de.stages[1]?.title]).toEqual([
      "Prüfung",
      "Entwurf",
      "Schreiben",
      "Done",
    ]);
    const action = de.activities[0]?.actions[0];
    // No German title: English.
    expect(action?.title).toBe("Send");
    expect(action?.params[0]?.title).toBe("Warum");
    expect(de.guards[0]?.title).toBe("Warten");
    expect(de.titles).toMatchObject({ a: "Entwurf", "a/a/send": "Send", "a/a/send/why": "Warum" });
    expect(sim.view(undefined, "fr").activities[0]?.actions[0]?.title).toBe("Envoyer");
    expect(sim.view().title).toBe("Review");
  });
});

describe("definition version on the run", () => {
  it("stamps the version at start and keeps it; the view says when the code's differs", () => {
    const sim = createWorkflowSimulator(editorialReview);
    expect(sim.state.definitionVersion).toBe(editorialReview.version);
    expect(sim.view().definitionChanged).toBe(false);
    // A title is not structure; a new field is.
    const retitled = defineWorkflow({ ...editorialReview, version: undefined, title: "Renamed" });
    const grown = defineWorkflow({
      ...editorialReview,
      version: undefined,
      fields: [...(editorialReview.fields ?? []), { name: "note", type: "text" }],
    });
    const projected = (def: WorkflowDefinition) =>
      view(def, sim.state, caller("u"), env(), { events: sim.events });
    expect(projected(retitled).definitionChanged).toBe(false);
    expect(projected(grown)).toMatchObject({
      definitionChanged: true,
      definitionVersion: editorialReview.version,
    });
    sim.fire("submit", author);
    expect(sim.state.definitionVersion).toBe(editorialReview.version);
  });
});
