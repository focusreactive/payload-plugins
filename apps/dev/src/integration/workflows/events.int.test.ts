import {
  EVENTS_SLUG,
  SCHEMA_VERSION,
  WORKFLOW_BYPASS,
  WORKFLOW_SKIP,
  WorkflowError,
  abortWorkflow,
  defineWorkflow,
  fireWorkflowAction,
  getWorkflowState,
  pruneWorkflows,
  startWorkflow,
} from "@focus-reactive/payload-plugin-workflows";
import type {
  WorkflowAccessArgs,
  WorkflowDefinition,
  WorkflowsPluginOptions,
} from "@focus-reactive/payload-plugin-workflows";
import type { Payload, TypedUser, Where } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { BASE_WORKFLOWS, bootWorkflowsPayload, historyOf, review } from "./bootWorkflowsPayload";
import type { WorkflowsTestPayload } from "./bootWorkflowsPayload";

// History as an append-only events collection: written with the run's state change or not at all,
// numbered exactly, readable only with the run, queryable for audits, prunable with its run; and
// what this pass added around it (bypass trace, skip flag, provenance, access arguments).

const SLUG = "workflow-instances";

/** Moves to `done` once its document's title is "Go" (a save settles it). */
const follow = defineWorkflow({
  name: "follow",
  collections: ["pages"],
  initialStage: "open",
  stages: [
    {
      name: "open",
      transitions: [{ name: "go", to: "done", when: ({ doc }) => doc?.title === "Go" }],
    },
    { name: "done" },
  ],
});

let booted: WorkflowsTestPayload;
let payload: Payload;
let author: TypedUser;
let editor: TypedUser;
let blind: TypedUser;
let noPages: TypedUser;
/** What `access.fire` was called with. */
const fired: WorkflowAccessArgs[] = [];
const restore: (() => void)[] = [];

const createUser = async (email: string, roles: string[]): Promise<TypedUser> => {
  const doc = await payload.create({
    collection: "users",
    data: { email, password: "test-password-1", roles } as never,
    overrideAccess: true,
  });
  return { ...doc, collection: "users" } as unknown as TypedUser;
};

const createPage = (title: string, context: Record<string, unknown> = {}) =>
  payload.create({
    collection: "pages",
    data: { title } as never,
    draft: true,
    overrideAccess: true,
    context,
  });

const runRow = async (id: string | number) =>
  (await payload.findByID({
    collection: SLUG as never,
    id: String(id),
    depth: 0,
    overrideAccess: true,
  })) as unknown as {
    revision: number;
    stage: string;
    status: string;
    nextSeq: number;
    schemaVersion: number;
    definitionVersion: string;
  };

const runsOn = async (pageId: string | number) =>
  (
    await payload.find({
      collection: SLUG as never,
      where: { subjectId: { equals: String(pageId) } },
      overrideAccess: true,
      pagination: false,
    })
  ).docs as unknown as { id: string | number; workflow: string; stage: string; status: string }[];

const codeOf = async (run: Promise<unknown>): Promise<string | undefined> => {
  try {
    await run;
  } catch (error) {
    if (error instanceof WorkflowError) {
      return error.code;
    }
    throw error;
  }
  return undefined;
};

/** A review run on a new page, submitted and claimed by the editor: in "review", publish held. */
const inReview = async (title: string) => {
  const page = await createPage(title);
  const run = await startWorkflow(payload, {
    workflow: "review",
    collection: "pages",
    id: page.id,
    user: author,
  });
  const id = run.id as string;
  await fireWorkflowAction(payload, { instanceId: id, action: "submit", user: author });
  await fireWorkflowAction(payload, { instanceId: id, action: "claim", user: editor });
  return { page, id };
};

/** Events as `user` reads them, with their access. */
const eventsAs = async (user: TypedUser, where: Where) =>
  (
    await payload.find({
      collection: EVENTS_SLUG as never,
      where,
      sort: "seq",
      pagination: false,
      overrideAccess: false,
      user,
      depth: 0,
    })
  ).docs as unknown as Record<string, unknown>[];

const access: WorkflowsPluginOptions["access"] = {
  fire: (args) => {
    fired.push(args);
    return args.user.collection === "users";
  },
};

beforeAll(async () => {
  booted = await bootWorkflowsPayload({ workflows: [...BASE_WORKFLOWS, follow], access });
  payload = booted.payload;
  author = await createUser("author@test.local", []);
  editor = await createUser("editor@test.local", ["editor"]);
  blind = await createUser("blind@test.local", ["editor", "blind"]);
  noPages = await createUser("no-pages@test.local", ["editor", "no-pages"]);
});

afterEach(() => {
  for (const undo of restore.splice(0).reverse()) {
    undo();
  }
});

afterAll(async () => {
  await booted?.cleanup();
});

describe("events are written with the state change, or not at all", () => {
  it("a failed event insert rolls back the run's write with it", async () => {
    const page = await createPage("Atomic events");
    const run = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: author,
    });
    const id = run.id as string;
    const before = await runRow(id);
    const events = await historyOf(payload, id);
    // `submit` writes three entries (action, transition, the automatic reset); the second fails.
    const create = payload.db.create.bind(payload.db);
    let inserted = 0;
    payload.db.create = (async (args: Parameters<typeof create>[0]) => {
      if (args.collection === EVENTS_SLUG && (inserted += 1) === 2) {
        throw new Error("injected event insert failure");
      }
      return create(args);
    }) as typeof payload.db.create;
    restore.push(() => {
      payload.db.create = create;
    });
    await expect(
      fireWorkflowAction(payload, { instanceId: id, action: "submit", user: author })
    ).rejects.toThrow("injected event insert failure");
    restore.splice(0).forEach((undo) => undo());
    expect(await runRow(id)).toMatchObject({
      revision: before.revision,
      stage: "drafting",
      nextSeq: before.nextSeq,
    });
    expect(await historyOf(payload, id)).toEqual(events);
  });

  it("a compare-and-swap loser writes no events: the retry's are the only ones, numbered on", async () => {
    const page = await createPage("CAS loser");
    const run = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: author,
    });
    const id = run.id as string;
    const before = await historyOf(payload, id);
    const updateOne = payload.db.updateOne.bind(payload.db);
    let losses = 1;
    // Another writer bumps the revision just before ours lands: our update matches no row.
    payload.db.updateOne = (async (args: Parameters<typeof updateOne>[0]) => {
      if (args.collection === SLUG && losses > 0) {
        losses -= 1;
        const current = await runRow(id);
        await updateOne({
          collection: SLUG,
          where: { id: { equals: id } },
          data: { revision: current.revision + 1 },
          req: args.req,
        });
      }
      return updateOne(args);
    }) as typeof payload.db.updateOne;
    restore.push(() => {
      payload.db.updateOne = updateOne;
    });
    const moved = await fireWorkflowAction(payload, {
      instanceId: id,
      action: "submit",
      user: author,
    });
    expect(moved.stage.name).toBe("review");
    const after = await historyOf(payload, id);
    expect(after.slice(0, before.length)).toEqual(before);
    expect(after.slice(before.length).map((row) => [row.seq, row.type])).toEqual([
      [before.length + 1, "action"],
      [before.length + 2, "transition"],
      [before.length + 3, "action"],
    ]);
    expect((await runRow(id)).nextSeq).toBe(after.length + 1);

    // Losing every attempt: `conflict`, and not one event.
    losses = 100;
    expect(
      await codeOf(fireWorkflowAction(payload, { instanceId: id, action: "claim", user: editor }))
    ).toBe("conflict");
    expect(await historyOf(payload, id)).toEqual(after);
  });
});

describe("the README's audit queries", () => {
  it("answer who approved what, what went past a hold, and what agents did", async () => {
    const since = new Date(Date.now() - 1000).toISOString();
    const { page, id } = await inReview("Audited");
    await fireWorkflowAction(payload, {
      instanceId: id,
      action: "approve",
      user: editor,
      via: "agent",
    });
    // Published while another run held it, with the bypass flag.
    const { page: forced, id: held } = await inReview("Forced");
    await payload.update({
      collection: "pages",
      id: forced.id,
      data: { _status: "published" } as never,
      overrideAccess: true,
      user: author,
      context: { [WORKFLOW_BYPASS]: true },
    });

    // 1. Who approved a review, and when (here: since the test began).
    const approvals = await eventsAs(editor, {
      and: [
        { type: { equals: "action" } },
        { workflow: { equals: "review" } },
        { action: { equals: "approve" } },
        { at: { greater_than_equal: since } },
      ],
    });
    expect(approvals.map((row) => [row.subjectId, row.actorId, row.via])).toEqual([
      [String(page.id), String(editor.id), "agent"],
    ]);

    // 2. Writes that went past a hold.
    const bypasses = await eventsAs(editor, { type: { equals: "guard-bypassed" } });
    expect(bypasses).toHaveLength(1);
    expect(bypasses[0]).toMatchObject({
      run: held,
      subjectId: String(forced.id),
      stage: "review",
      actorId: String(author.id),
      detail: { operation: "publish", guards: ["hold-publish"] },
    });

    // 3. Everything agents did since a date.
    const byAgents = await eventsAs(editor, {
      and: [{ via: { equals: "agent" } }, { at: { greater_than_equal: since } }],
    });
    expect(byAgents.map((row) => [row.type, row.action])).toEqual([["action", "approve"]]);
  });
});

/** Events of one page. */
const of = (page: { id: string | number }): Where => ({
  subjectId: { equals: String(page.id) },
});

describe("reading events", () => {
  it("follows the runs' read rule: no events of a run on a document the viewer cannot read", async () => {
    const secret = await createPage("Secret");
    const open = await createPage("Open");
    for (const page of [secret, open]) {
      await startWorkflow(payload, {
        workflow: "review",
        collection: "pages",
        id: page.id,
        user: editor,
      });
    }
    expect((await eventsAs(editor, of(secret))).length).toBeGreaterThan(0);
    expect(await eventsAs(blind, of(secret))).toEqual([]);
    expect((await eventsAs(blind, of(open))).length).toBeGreaterThan(0);
    expect(await eventsAs(noPages, {})).toEqual([]);
  });

  it("is a paginated read of the latest entries; the run keeps none of them", async () => {
    const { id } = await inReview("Paged");
    const row = (await payload.findByID({
      collection: SLUG as never,
      id,
      depth: 0,
      overrideAccess: true,
    })) as Record<string, unknown>;
    expect(row).not.toHaveProperty("history");
    const [view] = (
      await getWorkflowState(payload, {
        collection: "pages",
        id: row.subjectId as string,
        user: editor,
      })
    ).instances;
    expect(view?.history.map((entry) => entry.seq)).toEqual(
      (await historyOf(payload, id)).map((entry) => entry.seq)
    );
  });
});

describe("pruneWorkflows", () => {
  it("deletes finished runs older than the date with their events, in batches; never active ones", async () => {
    // Earlier tests' finished runs count too: prune them first.
    await pruneWorkflows(payload, { finishedBefore: new Date(Date.now() + 60_000) });
    const { id: completed } = await inReview("Pruned done");
    await fireWorkflowAction(payload, { instanceId: completed, action: "approve", user: editor });
    const stopped = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: (await createPage("Pruned stop")).id,
      user: author,
    });
    await abortWorkflow(payload, { instanceId: stopped.id as string, user: author });
    const active = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: (await createPage("Kept")).id,
      user: author,
    });
    const activeEvents = await historyOf(payload, active.id as string);
    const finishedEvents =
      (await historyOf(payload, completed)).length +
      (await historyOf(payload, stopped.id as string)).length;

    expect(
      await pruneWorkflows(payload, { finishedBefore: new Date(Date.now() - 60_000) })
    ).toEqual({ runs: 0, events: 0 });
    expect(
      await pruneWorkflows(payload, { finishedBefore: new Date(Date.now() + 60_000) })
    ).toEqual({ runs: 2, events: finishedEvents });
    expect(await historyOf(payload, completed)).toEqual([]);
    expect(await historyOf(payload, stopped.id as string)).toEqual([]);
    expect(await historyOf(payload, active.id as string)).toEqual(activeEvents);
    expect((await runRow(active.id as string)).status).toBe("active");
    await expect(runRow(completed)).rejects.toBeDefined();
  });
});

describe("the bypass flag leaves a trace", () => {
  it("records a delete that went through a holding guard, then the run stops (its trail kept)", async () => {
    const page = await createPage("Auto");
    const [run] = await runsOn(page.id);
    await payload.delete({
      collection: "pages",
      id: page.id,
      overrideAccess: true,
      user: editor,
      context: { [WORKFLOW_BYPASS]: true },
    });
    const history = await historyOf(payload, run!.id);
    expect(history.slice(-2)).toMatchObject([
      {
        type: "guard-bypassed",
        stage: "open",
        actorId: String(editor.id),
        operation: "delete",
        guards: ["keep"],
      },
      { type: "aborted", cause: "delete", causeDetail: { by: { id: String(editor.id) } } },
    ]);
  });

  it("records nothing when no guard would have held the write", async () => {
    const page = await createPage("Not held");
    const run = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: author,
    });
    const before = await historyOf(payload, run.id as string);
    await payload.update({
      collection: "pages",
      id: page.id,
      data: { _status: "published" } as never,
      overrideAccess: true,
      context: { [WORKFLOW_BYPASS]: true },
    });
    expect(await historyOf(payload, run.id as string)).toEqual(before);
  });
});

describe("the skip flag", () => {
  it("neither auto-starts nor settles for that request; later saves do", async () => {
    const skipped = await createPage("Auto", { [WORKFLOW_SKIP]: true });
    expect(await runsOn(skipped.id)).toEqual([]);
    expect((await runsOn((await createPage("Auto")).id)).map((run) => run.workflow)).toEqual([
      "auto-start",
    ]);

    const page = await createPage("Follow me");
    const run = await startWorkflow(payload, {
      workflow: "follow",
      collection: "pages",
      id: page.id,
      user: author,
    });
    const save = (context: Record<string, unknown>) =>
      payload.update({
        collection: "pages",
        id: page.id,
        data: { title: "Go" } as never,
        draft: true,
        overrideAccess: true,
        user: author,
        context,
      });
    await save({ [WORKFLOW_SKIP]: true });
    expect((await runRow(run.id as string)).stage).toBe("open");
    await save({});
    expect((await runRow(run.id as string)).stage).toBe("done");
    // The save that settled it is the cause, with who saved.
    expect((await historyOf(payload, run.id as string)).at(-1)).toMatchObject({
      type: "completed",
      cause: "save",
      causeDetail: { by: { id: String(author.id), collection: "users" } },
    });
  });

  it("leaves guards on: a held publish is still refused", async () => {
    const { page } = await inReview("Skip keeps guards");
    await expect(
      payload.update({
        collection: "pages",
        id: page.id,
        data: { _status: "published" } as never,
        overrideAccess: true,
        context: { [WORKFLOW_SKIP]: true },
      })
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("provenance", () => {
  it("stamps the run with the stored format and the definition version, and says when the code changed", async () => {
    const page = await createPage("Stamped");
    const run = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: author,
    });
    const id = run.id as string;
    expect(await runRow(id)).toMatchObject({
      schemaVersion: SCHEMA_VERSION,
      definitionVersion: review.version,
    });
    expect((await historyOf(payload, id))[0]).toMatchObject({
      type: "started",
      definitionVersion: review.version,
    });
    expect(run).toMatchObject({ definitionVersion: review.version, definitionChanged: false });

    // The code changes structurally (a new field) after the run started.
    const workflows = (payload.config.custom as { workflows: { workflows: WorkflowDefinition[] } })
      .workflows.workflows;
    const index = workflows.findIndex((def) => def.name === "review");
    const original = workflows[index]!;
    workflows[index] = defineWorkflow({
      ...original,
      version: undefined,
      fields: [...(original.fields ?? []), { name: "note", type: "text" }],
    });
    restore.push(() => {
      workflows[index] = original;
    });
    const viewed = await getWorkflowState(payload, {
      collection: "pages",
      id: page.id,
      user: author,
    });
    expect(viewed.instances[0]).toMatchObject({
      definitionVersion: review.version,
      definitionChanged: true,
    });
    // The run keeps its stamp as it moves on.
    await fireWorkflowAction(payload, { instanceId: id, action: "submit", user: author });
    expect((await runRow(id)).definitionVersion).toBe(review.version);
  });
});

describe("access.fire", () => {
  it("gets the stage, the activity, the action and the run", async () => {
    const page = await createPage("Access args");
    const run = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: author,
    });
    fired.length = 0;
    await fireWorkflowAction(payload, {
      instanceId: run.id as string,
      action: "submit",
      user: author,
    });
    expect(fired).toHaveLength(1);
    expect(fired[0]).toMatchObject({
      stage: "drafting",
      activity: "drafting",
      action: "submit",
      run: { id: run.id, fields: {} },
      collection: "pages",
      id: String(page.id),
    });
  });
});
