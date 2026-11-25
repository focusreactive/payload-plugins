import {
  WorkflowError,
  abortWorkflow,
  defineWorkflow,
  fireWorkflowAction,
  getWorkflowState,
  listWorkflowInstances,
  startWorkflow,
  tickWorkflows,
} from "@focus-reactive/payload-plugin-workflows";
import { commitTransaction, createLocalReq, initTransaction } from "payload";
import type { Payload, TypedUser } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  BASE_WORKFLOWS,
  bootWorkflowsPayload,
  flaky,
  gate,
  leak,
  onSave,
  timer,
} from "./bootWorkflowsPayload";
import type { WorkflowsTestPayload } from "./bootWorkflowsPayload";

const SLUG = "workflow-instances";

/** A delete guard lifted by the document's latest draft. */
const lockable = defineWorkflow({
  name: "lockable",
  collections: ["pages"],
  initialStage: "open",
  stages: [
    {
      name: "open",
      guards: [
        {
          name: "locked",
          title: "Locked",
          operations: ["delete"],
          unless: ({ doc }) => doc?.title === "Unlocked",
        },
      ],
      activities: [{ name: "close", actions: [{ name: "close", status: "done" }] }],
      transitions: [{ name: "closed", to: "closed" }],
    },
    { name: "closed" },
  ],
});

let booted: WorkflowsTestPayload;
let payload: Payload;
let author: TypedUser;
let editor: TypedUser;
let blind: TypedUser;
let client: TypedUser;

const createUser = async (
  email: string,
  roles: string[],
  collection: "users" | "clients" = "users"
): Promise<TypedUser> => {
  const doc = await payload.create({
    collection,
    data: {
      email,
      password: "test-password-1",
      ...(collection === "users" ? { roles } : {}),
    } as never,
    overrideAccess: true,
  });
  return { ...doc, collection } as unknown as TypedUser;
};

const createPage = async (title: string) =>
  payload.create({
    collection: "pages",
    data: { title } as never,
    draft: true,
    overrideAccess: true,
  });

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

const failure = (run: Promise<unknown>) =>
  run.then(() => null).catch((error: { status?: number; message?: string }) => error);

type Run = {
  id: number | string;
  workflow: string;
  status: string;
  stage: string;
  history: { type: string; effect?: string; status?: string; reason?: string; error?: string }[];
};

const runsOf = async (pageId: number | string, workflow?: string): Promise<Run[]> =>
  (
    await payload.find({
      collection: SLUG as never,
      where: {
        and: [
          { subjectId: { equals: String(pageId) } },
          ...(workflow ? [{ workflow: { equals: workflow } }] : []),
        ],
      },
      overrideAccess: true,
      pagination: false,
    })
  ).docs as unknown as Run[];

const jobsOf = async (effect: string) =>
  (
    await payload.find({
      collection: "payload-jobs" as never,
      overrideAccess: true,
      pagination: false,
    })
  ).docs.filter(
    (job) => (job as unknown as { input?: { effect?: string } }).input?.effect === effect
  ) as unknown as { id: number; completedAt?: string | null; log?: unknown; error?: unknown }[];

const inReview = async (title: string) => {
  const page = await createPage(title);
  const run = await startWorkflow(payload, {
    workflow: "review",
    collection: "pages",
    id: page.id,
    user: author,
  });
  await fireWorkflowAction(payload, {
    instanceId: run.id as string,
    action: "submit",
    user: author,
  });
  return { page, id: run.id as string };
};

beforeAll(async () => {
  booted = await bootWorkflowsPayload({
    workflows: [...BASE_WORKFLOWS, onSave, leak, flaky, timer, lockable],
  });
  payload = booted.payload;
  author = await createUser("author@test.local", []);
  editor = await createUser("editor@test.local", ["editor"]);
  blind = await createUser("blind@test.local", ["editor", "blind"]);
  client = await createUser("client@test.local", [], "clients");
});

afterAll(async () => {
  await booted?.cleanup();
});

describe("who may see and move a workflow", () => {
  it("public functions need a real user: a missing one is unauthorized", async () => {
    const page = await createPage("Nobody");
    const started = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: author,
    });
    const instanceId = started.id as string;
    for (const user of [null, undefined]) {
      expect(
        await codeOf(
          startWorkflow(payload, { workflow: "leak", collection: "pages", id: page.id, user })
        )
      ).toBe("unauthorized");
      expect(await codeOf(abortWorkflow(payload, { instanceId, user }))).toBe("unauthorized");
      expect(
        await codeOf(fireWorkflowAction(payload, { instanceId, action: "submit", user }))
      ).toBe("unauthorized");
      expect(
        await codeOf(getWorkflowState(payload, { collection: "pages", id: page.id, user }))
      ).toBe("unauthorized");
      expect(await codeOf(listWorkflowInstances(payload, { scope: "all", user }))).toBe(
        "unauthorized"
      );
    }
    expect((await runsOf(page.id)).map((run) => run.status)).toEqual(["active"]);
  });

  it("by default only users of the admin user collection may start, fire, abort, read state or list", async () => {
    const page = await createPage("Clients");
    const run = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: author,
    });
    const instanceId = run.id as string;
    expect(
      await codeOf(
        startWorkflow(payload, { workflow: "leak", collection: "pages", id: page.id, user: client })
      )
    ).toBe("not-allowed");
    expect(
      await codeOf(
        fireWorkflowAction(payload, {
          instanceId,
          action: "submit",
          user: client,
        })
      )
    ).toBe("not-allowed");
    expect(await codeOf(abortWorkflow(payload, { instanceId, user: client }))).toBe("not-allowed");
    expect(
      await codeOf(getWorkflowState(payload, { collection: "pages", id: page.id, user: client }))
    ).toBe("not-allowed");
    expect(await codeOf(listWorkflowInstances(payload, { scope: "all", user: client }))).toBe(
      "not-allowed"
    );
    // The runs collection itself: read by admin users only.
    await expect(
      payload.find({ collection: SLUG as never, overrideAccess: false, user: client })
    ).rejects.toMatchObject({ status: 403 });
    expect(
      (await payload.find({ collection: SLUG as never, overrideAccess: false, user: author }))
        .totalDocs
    ).toBeGreaterThan(0);
    expect((await runsOf(page.id))[0]?.stage).toBe("drafting");
  });

  it("a caller who cannot read the document can neither see nor move its run", async () => {
    const { page, id } = await inReview("Secret");
    expect(
      await codeOf(getWorkflowState(payload, { collection: "pages", id: page.id, user: blind }))
    ).toBe("unknown-subject");
    expect(
      await codeOf(
        fireWorkflowAction(payload, {
          instanceId: id,
          activity: "review",
          action: "claim",
          user: blind,
        })
      )
    ).toBe("unknown-subject");
    expect(await codeOf(abortWorkflow(payload, { instanceId: id, user: blind }))).toBe(
      "unknown-subject"
    );
  });

  it("the inbox drops runs on documents the caller cannot read, and paginates what is left", async () => {
    await inReview("Secret");
    await inReview("Open 1");
    await inReview("Open 2");
    const forEditor = await listWorkflowInstances(payload, {
      scope: "mine",
      user: editor,
      limit: 100,
    });
    const forBlind = await listWorkflowInstances(payload, {
      scope: "mine",
      user: blind,
      limit: 100,
    });
    const secret = forEditor.docs.filter((doc) => doc.subject.title === "Secret").length;
    expect(secret).toBeGreaterThan(0);
    expect(forBlind.docs.some((doc) => doc.subject.title === "Secret")).toBe(false);
    expect(forBlind.totalDocs).toBe(forEditor.totalDocs - secret);
    expect(forBlind.docs.map((doc) => doc.id)).toEqual(
      forEditor.docs.filter((doc) => doc.subject.title !== "Secret").map((doc) => doc.id)
    );
    // One per page: every visible run exactly once, and the totals count only visible ones.
    const seen: string[] = [];
    for (let page = 1; page <= forBlind.totalDocs; page += 1) {
      const result = await listWorkflowInstances(payload, {
        scope: "mine",
        user: blind,
        limit: 1,
        page,
      });
      expect(result.totalDocs).toBe(forBlind.totalDocs);
      expect(result.totalPages).toBe(forBlind.totalDocs);
      expect(result.page).toBe(page);
      seen.push(...result.docs.map((doc) => doc.id));
    }
    expect(seen).toEqual(forBlind.docs.map((doc) => doc.id));
  });
});

describe("guards", () => {
  const update = (id: number | string, data: Record<string, unknown>, draft?: boolean) =>
    payload.update({
      collection: "pages",
      id,
      data: data as never,
      overrideAccess: true,
      ...(draft === undefined ? {} : { draft }),
    });

  it("publish: a draft save of a published doc passes; a plain update or a publish is refused", async () => {
    const page = await createPage("Live");
    await update(page.id, { _status: "published" });
    const run = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: author,
    });
    await fireWorkflowAction(payload, {
      instanceId: run.id as string,
      action: "submit",
      user: author,
    });
    // Without `draft` and without `_status`, Payload writes the live document: that is a publish.
    const plain = await failure(update(page.id, { title: "Live (sneaked)" }));
    expect(plain).toMatchObject({
      status: 403,
      message: "Publishing is on hold. Publishing is held until review is approved",
    });
    const published = await payload.findByID({
      collection: "pages",
      id: page.id,
      overrideAccess: true,
    });
    expect(published.title).toBe("Live");
    await update(page.id, { title: "Live (draft edit)" }, true);

    const draftOnly = await createPage("Draft only");
    const second = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: draftOnly.id,
      user: author,
    });
    await fireWorkflowAction(payload, {
      instanceId: second.id as string,
      action: "submit",
      user: author,
    });
    expect(await failure(update(draftOnly.id, { _status: "published" }))).toMatchObject({
      status: 403,
    });
    // A plain update of a doc that was never published writes no live version: allowed.
    await update(draftOnly.id, { title: "Draft only 2" });
  });

  it("moving to the trash counts as a delete, and aborts the document's runs", async () => {
    const held = await createPage("Auto");
    expect(await failure(update(held.id, { deletedAt: new Date().toISOString() }))).toMatchObject({
      status: 403,
      message: "Deleting is on hold. Cannot delete while open",
    });
    expect((await runsOf(held.id, "auto-start"))[0]?.status).toBe("active");

    // A published page in review: its publish guard does not stop trashing it.
    const page = await createPage("Trashed");
    await update(page.id, { _status: "published" });
    const run = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: author,
    });
    await fireWorkflowAction(payload, {
      instanceId: run.id as string,
      action: "submit",
      user: author,
    });
    await update(page.id, { deletedAt: new Date().toISOString() });
    const [aborted] = await runsOf(page.id, "review");
    expect(aborted?.status).toBe("aborted");
    expect(aborted?.history.at(-1)).toMatchObject({ type: "aborted", reason: "Subject deleted" });
  });

  it("delete: `unless` reads the latest draft", async () => {
    const page = await createPage("Locked");
    await update(page.id, { _status: "published" });
    await update(page.id, { title: "Unlocked" }, true);
    await startWorkflow(payload, {
      workflow: "lockable",
      collection: "pages",
      id: page.id,
      user: author,
    });
    await payload.delete({ collection: "pages", id: page.id, overrideAccess: true });

    const kept = await createPage("Unlocked");
    await update(kept.id, { _status: "published" });
    await update(kept.id, { title: "Locked" }, true);
    await startWorkflow(payload, {
      workflow: "lockable",
      collection: "pages",
      id: kept.id,
      user: author,
    });
    await expect(
      payload.delete({ collection: "pages", id: kept.id, overrideAccess: true })
    ).rejects.toMatchObject({ status: 403, message: "Deleting is on hold. Locked" });
  });

  it("the bypass set by one effect does not leak into the next job", async () => {
    const page = await createPage("Leaky");
    const run = await startWorkflow(payload, {
      workflow: "leak",
      collection: "pages",
      id: page.id,
      user: author,
    });
    await fireWorkflowAction(payload, {
      instanceId: run.id as string,
      activity: "x",
      action: "go",
      user: author,
    });
    expect(booted.bypassSeen).toEqual([false]);
  });
});

describe("start fields", () => {
  it("only `input: true` fields may be supplied, type-checked", async () => {
    const page = await createPage("Inputs");
    expect(
      await codeOf(
        startWorkflow(payload, {
          workflow: "review",
          collection: "pages",
          id: page.id,
          fields: { decision: "approved" },
          user: author,
        })
      )
    ).toBe("invalid-patch");
    expect(
      await codeOf(
        startWorkflow(payload, {
          workflow: "timer",
          collection: "pages",
          id: page.id,
          fields: { label: 5 },
          user: author,
        })
      )
    ).toBe("invalid-patch");
    const started = await startWorkflow(payload, {
      workflow: "timer",
      collection: "pages",
      id: page.id,
      fields: { label: "x" },
      user: author,
    });
    expect(started.fields).toEqual({ label: "x" });
  });
});

describe("effects and transactions", () => {
  it("a caller's req with an open transaction: effects stay queued until a runner takes them", async () => {
    const page = await createPage("Caller tx");
    const req = await createLocalReq({ user: author }, payload);
    expect(await initTransaction(req)).toBe(true);
    const view = await startWorkflow(payload, {
      workflow: "ai-check",
      collection: "pages",
      id: page.id,
      user: author,
      req,
    });
    expect(view.status).toBe("active");
    await commitTransaction(req);
    const [run] = await runsOf(page.id, "ai-check");
    expect(run?.history.filter((h) => h.type === "effect").map((h) => h.status)).toEqual([
      "queued",
    ]);
    await payload.jobs.run({ queue: "workflows-plugin", sequential: true });
    expect((await runsOf(page.id, "ai-check"))[0]?.status).toBe("completed");
  });

  it("effects queued by a save inside its transaction wait for the runner (create and update)", async () => {
    const created = await createPage("Effect go");
    expect((await runsOf(created.id, "on-save"))[0]?.status).toBe("active");
    const saved = await createPage("Effect");
    await payload.update({
      collection: "pages",
      id: saved.id,
      data: { title: "Effect go" } as never,
      draft: true,
      overrideAccess: true,
    });
    expect((await runsOf(saved.id, "on-save"))[0]?.status).toBe("active");
    await payload.jobs.run({ queue: "workflows-plugin", sequential: true });
    expect((await runsOf(created.id, "on-save"))[0]?.status).toBe("completed");
    expect((await runsOf(saved.id, "on-save"))[0]?.status).toBe("completed");
  });

  it("a failure recording the failure does not hide the handler's error", async () => {
    const page = await createPage("Flaky");
    const run = await startWorkflow(payload, {
      workflow: "flaky",
      collection: "pages",
      id: page.id,
      user: author,
    });
    const updateOne = payload.db.updateOne.bind(payload.db);
    payload.db.updateOne = (async (args: Parameters<typeof updateOne>[0]) => {
      const history = (args.data as { history?: { type: string; status?: string }[] }).history;
      if (history?.some((entry) => entry.type === "effect" && entry.status === "failed")) {
        throw new Error("db down");
      }
      return updateOne(args);
    }) as typeof payload.db.updateOne;
    try {
      await fireWorkflowAction(payload, {
        instanceId: run.id as string,
        activity: "x",
        action: "go",
        user: author,
      });
    } finally {
      payload.db.updateOne = updateOne;
    }
    const [job] = await jobsOf("boom");
    const recorded = JSON.stringify([job?.log, job?.error]);
    expect(recorded).toContain("handler boom");
    expect(recorded).not.toContain("db down");
  });
});

describe("smaller", () => {
  it("state and start on a collection no workflow covers is unknown-subject", async () => {
    const post = await payload.create({
      collection: "posts",
      data: { title: "P" } as never,
      overrideAccess: true,
    });
    for (const collection of ["posts", "nope"]) {
      expect(
        await codeOf(getWorkflowState(payload, { collection, id: post.id, user: author }))
      ).toBe("unknown-subject");
      expect(
        await codeOf(
          startWorkflow(payload, { workflow: "review", collection, id: post.id, user: author })
        )
      ).toBe("unknown-subject");
    }
  });

  it("state with an id that cannot exist is unknown-subject", async () => {
    for (const id of ["abc", "999999"]) {
      expect(
        await codeOf(getWorkflowState(payload, { collection: "pages", id, user: author }))
      ).toBe("unknown-subject");
    }
  });

  it("a save that moves nothing reads the active runs once per hook, without their history", async () => {
    const page = await createPage("Cheap");
    for (const workflow of ["review", "leak"]) {
      await startWorkflow(payload, { workflow, collection: "pages", id: page.id, user: author });
    }
    const find = payload.find.bind(payload);
    const findByID = payload.findByID.bind(payload);
    const finds: Parameters<Payload["find"]>[0][] = [];
    let byIds = 0;
    payload.find = (async (args: Parameters<Payload["find"]>[0]) => {
      if (args.collection === SLUG) {
        finds.push(args);
      }
      return find(args);
    }) as Payload["find"];
    payload.findByID = (async (args: Parameters<Payload["findByID"]>[0]) => {
      if (args.collection === SLUG) {
        byIds += 1;
      }
      return findByID(args);
    }) as Payload["findByID"];
    try {
      await payload.update({
        collection: "pages",
        id: page.id,
        data: { title: "Cheap 2" } as never,
        draft: true,
        overrideAccess: true,
      });
    } finally {
      payload.find = find;
      payload.findByID = findByID;
    }
    expect(finds).toHaveLength(2); // beforeChange guard + afterChange settle
    expect(finds.every((args) => (args.select as Record<string, unknown>)?.history === false)).toBe(
      true
    );
    expect(byIds).toBe(0);
  });

  it("the tick pages through active runs and settles every one, even as they complete", async () => {
    const ids: (number | string)[] = [];
    for (let i = 0; i < 130; i += 1) {
      const page = await payload.create({
        collection: "pages",
        data: { title: `Tick ${i}` } as never,
        draft: true,
        overrideAccess: true,
      });
      await startWorkflow(payload, {
        workflow: "timer",
        collection: "pages",
        id: page.id,
        user: author,
      });
      ids.push(page.id);
    }
    const find = payload.find.bind(payload);
    const limits: number[] = [];
    payload.find = (async (args: Parameters<Payload["find"]>[0]) => {
      if (args.collection === SLUG && JSON.stringify(args.where).includes('"active"')) {
        limits.push(args.limit ?? -1);
      }
      return find(args);
    }) as Payload["find"];
    gate.open = true;
    try {
      const tick = await tickWorkflows(payload);
      expect(tick.advanced).toBeGreaterThanOrEqual(130);
    } finally {
      payload.find = find;
      gate.open = false;
    }
    expect(limits.length).toBeGreaterThan(1);
    expect(limits.every((limit) => limit > 0 && limit <= 100)).toBe(true);
    const left = await payload.find({
      collection: SLUG as never,
      where: { and: [{ workflow: { equals: "timer" } }, { status: { equals: "active" } }] },
      overrideAccess: true,
    });
    expect(left.totalDocs).toBe(0);
  });
});
