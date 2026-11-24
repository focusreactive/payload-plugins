import {
  WorkflowError,
  fireWorkflowAction,
  getWorkflowState,
  listWorkflowInstances,
  startWorkflow,
  tickWorkflows,
} from "@focus-reactive/payload-plugin-workflows";
import type { Payload, TypedUser } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootWorkflowsPayload } from "./bootWorkflowsPayload";
import type { WorkflowsTestPayload } from "./bootWorkflowsPayload";

const SLUG = "workflow-instances";

let booted: WorkflowsTestPayload;
let payload: Payload;
let author: TypedUser;
let editor: TypedUser;

const createUser = async (email: string, roles: string[]): Promise<TypedUser> => {
  const doc = await payload.create({
    collection: "users",
    data: { email, password: "test-password-1", roles } as never,
    overrideAccess: true,
  });
  return { ...doc, collection: "users" } as unknown as TypedUser;
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

const instanceDoc = async (id: string) =>
  (await payload.findByID({
    collection: SLUG as never,
    id,
    depth: 0,
    overrideAccess: true,
  })) as unknown as {
    revision: number;
    status: string;
    stage: string;
    activeKey: string;
    assignedUsers: string[];
    assignedRoles: string[];
    history: { type: string; effect?: string; status?: string; reason?: string }[];
  };

beforeAll(async () => {
  booted = await bootWorkflowsPayload();
  payload = booted.payload;
  author = await createUser("author@test.local", []);
  editor = await createUser("editor@test.local", ["editor"]);
});

afterAll(async () => {
  await booted?.cleanup();
});

describe("workflows against a real Payload", () => {
  it("start -> guard blocks publish -> fire through approval -> publish succeeds -> completed", async () => {
    const page = await createPage("Hello");
    const started = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: author,
      via: "admin",
    });
    expect(started.stage.name).toBe("drafting");
    expect(started.subject).toEqual({ collection: "pages", id: String(page.id), title: "Hello" });
    expect(started.canAbort).toBe(true);
    const id = started.id as string;

    const submitted = await fireWorkflowAction(payload, {
      instanceId: id,
      action: "submit",
      user: author,
    });
    expect(submitted.stage.name).toBe("review");
    expect(submitted.guards.map((g) => g.name)).toEqual(["hold-publish"]);

    // The inbox: the run waits on the editor role.
    const forEditor = await listWorkflowInstances(payload, { scope: "mine", user: editor });
    expect(forEditor.docs.map((d) => d.id)).toContain(id);
    expect(forEditor.docs.find((d) => d.id === id)?.subject.title).toBe("Hello");
    const forAuthor = await listWorkflowInstances(payload, { scope: "mine", user: author });
    expect(forAuthor.docs.map((d) => d.id)).not.toContain(id);

    // The guard is real: any writer is refused while the run holds in review.
    const blocked = await payload
      .update({
        collection: "pages",
        id: page.id,
        data: { _status: "published" } as never,
        overrideAccess: true,
      })
      .then(
        () => null,
        (error: { status?: number; message?: string }) => error
      );
    expect(blocked?.status).toBe(403);
    expect(blocked?.message).toBe(
      "Publishing is on hold. Publishing is held until review is approved"
    );
    // A draft save is not a publish and goes through.
    await payload.update({
      collection: "pages",
      id: page.id,
      data: { title: "Hello 2" } as never,
      draft: true,
      overrideAccess: true,
    });

    // The author may not approve; the editor claims, after which the run waits on them alone.
    expect(
      await codeOf(
        fireWorkflowAction(payload, {
          instanceId: id,
          activity: "review",
          action: "approve",
          user: author,
        })
      )
    ).toBe("not-allowed");
    await fireWorkflowAction(payload, {
      instanceId: id,
      activity: "review",
      action: "claim",
      user: editor,
    });
    const claimed = await instanceDoc(id);
    expect(claimed.assignedUsers).toEqual([String(editor.id)]);
    expect(claimed.assignedRoles).toEqual([]);
    expect(
      (await listWorkflowInstances(payload, { scope: "mine", user: editor })).docs.map((d) => d.id)
    ).toContain(id);

    const approved = await fireWorkflowAction(payload, {
      instanceId: id,
      activity: "review",
      action: "approve",
      user: editor,
      via: "agent",
    });
    expect(approved.status).toBe("completed");
    expect(approved.stage.name).toBe("approved");
    expect(approved.guards).toEqual([]);
    // The effect ran inline after the commit and is in the history.
    expect(booted.notified).toEqual([String(page.id)]);
    expect(
      approved.history
        .filter((h) => h.type === "effect")
        .map((h) => (h as { status: string }).status)
    ).toEqual(["queued", "done"]);
    const approveEntry = approved.history.find(
      (h) => h.type === "action" && h.action === "approve"
    );
    expect(approveEntry?.actor).toEqual({
      id: String(editor.id),
      collection: "users",
      via: "agent",
    });

    const published = await payload.update({
      collection: "pages",
      id: page.id,
      data: { _status: "published" } as never,
      overrideAccess: true,
    });
    expect((published as { _status?: string })._status).toBe("published");
    const done = await instanceDoc(id);
    expect(done.status).toBe("completed");
    expect(done.activeKey.startsWith("done:")).toBe(true);

    const state = await getWorkflowState(payload, {
      collection: "pages",
      id: page.id,
      user: editor,
    });
    expect(state.instances.map((i) => i.status)).toEqual(["completed"]);
    expect(state.available.map((a) => a.name)).toEqual(["review", "ai-check", "auto-start"]);
  });

  it("refuses a second start of the same workflow on the same doc, also at the unique index", async () => {
    const page = await createPage("Twice");
    await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: author,
    });
    expect(
      await codeOf(
        startWorkflow(payload, {
          workflow: "review",
          collection: "pages",
          id: page.id,
          user: author,
        })
      )
    ).toBe("already-running");

    // Skip the friendly pre-check so the database's unique `activeKey` has to catch it.
    const find = payload.find.bind(payload);
    payload.find = (async (args: Parameters<Payload["find"]>[0]) => {
      const where = JSON.stringify(args.where ?? {});
      if (args.collection === SLUG && where.includes("activeKey")) {
        return { docs: [], totalDocs: 0 };
      }
      return find(args);
    }) as Payload["find"];
    try {
      expect(
        await codeOf(
          startWorkflow(payload, {
            workflow: "review",
            collection: "pages",
            id: page.id,
            user: author,
          })
        )
      ).toBe("already-running");
    } finally {
      payload.find = find;
    }
    const runs = await payload.find({
      collection: SLUG as never,
      where: { subjectId: { equals: String(page.id) } },
      overrideAccess: true,
    });
    expect(runs.totalDocs).toBe(1);
  });

  it("optimistic lock: a concurrent write reruns the operation; one that never stops is a conflict", async () => {
    const page = await createPage("Racy");
    const run = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: author,
    });
    const id = run.id as string;
    const findByID = payload.findByID.bind(payload);
    let bumps = 0;
    // Someone else writes the run between our read and our write (inside our transaction).
    payload.findByID = (async (args: Parameters<Payload["findByID"]>[0]) => {
      const doc = (await findByID(args)) as { id: string; revision: number } | null;
      if (doc && args.collection === SLUG && bumps > 0) {
        bumps -= 1;
        await payload.db.updateOne({
          collection: SLUG,
          id: doc.id,
          data: { revision: doc.revision + 1 },
          req: args.req,
        });
      }
      return doc;
    }) as Payload["findByID"];
    try {
      const before = await instanceDoc(id);
      bumps = 1;
      const moved = await fireWorkflowAction(payload, {
        instanceId: id,
        action: "submit",
        user: author,
      });
      expect(moved.stage.name).toBe("review");
      const after = await instanceDoc(id);
      // One foreign bump + our own write.
      expect(after.revision).toBe(before.revision + 2);
      expect(after.history.filter((h) => h.type === "action")).toHaveLength(2); // submit + auto reset, once

      bumps = 100;
      expect(
        await codeOf(
          fireWorkflowAction(payload, {
            instanceId: id,
            activity: "review",
            action: "claim",
            user: editor,
          })
        )
      ).toBe("conflict");
      bumps = 0;
      expect((await instanceDoc(id)).stage).toBe("review");
    } finally {
      payload.findByID = findByID;
    }
  });

  it("an effect handler that returns { set } moves the run", async () => {
    const page = await createPage("Checked");
    const view = await startWorkflow(payload, {
      workflow: "ai-check",
      collection: "pages",
      id: page.id,
      user: author,
    });
    expect(view.status).toBe("completed");
    expect(view.stage.name).toBe("passed");
    expect(view.fields).toEqual({ verdict: "pass" });
    expect(view.history.map((h) => h.type)).toEqual([
      "started",
      "action",
      "effect",
      "effect",
      "transition",
      "completed",
    ]);
  });

  it("outbox: when queueing the effect fails, the state change is rolled back with it", async () => {
    const page = await createPage("Atomic");
    const run = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: author,
    });
    const id = run.id as string;
    await fireWorkflowAction(payload, {
      instanceId: id,
      action: "submit",
      user: author,
    });
    await fireWorkflowAction(payload, {
      instanceId: id,
      activity: "review",
      action: "claim",
      user: editor,
    });
    const before = await instanceDoc(id);
    const queue = payload.jobs.queue;
    payload.jobs.queue = (() => Promise.reject(new Error("queue down"))) as typeof queue;
    try {
      await expect(
        fireWorkflowAction(payload, {
          instanceId: id,
          activity: "review",
          action: "approve",
          user: editor,
        })
      ).rejects.toThrow("queue down");
    } finally {
      payload.jobs.queue = queue;
    }
    const after = await instanceDoc(id);
    expect(after.revision).toBe(before.revision);
    expect(after.stage).toBe("review");
    expect(after.status).toBe("active");
  });

  it("auto-starts on create inside the save's transaction; a delete guard holds; the tick settles", async () => {
    const page = await createPage("Auto");
    const runs = await payload.find({
      collection: SLUG as never,
      where: { subjectId: { equals: String(page.id) } },
      overrideAccess: true,
    });
    expect(runs.docs.map((d) => (d as unknown as { workflow: string }).workflow)).toEqual([
      "auto-start",
    ]);
    expect((await createPage("Not auto")).id).toBeDefined();
    await expect(
      payload.delete({ collection: "pages", id: page.id, overrideAccess: true })
    ).rejects.toMatchObject({
      status: 403,
      message: "Deleting is on hold. Cannot delete while open",
    });
    const tick = await tickWorkflows(payload);
    expect(tick.checked).toBeGreaterThan(0);
    expect(tick.advanced).toBe(0);
  });

  it("names people by id: the admin resolves display names itself, with the viewer's access", async () => {
    const page = await createPage("Named");
    const run = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: author,
    });
    const id = run.id as string;
    await fireWorkflowAction(payload, {
      instanceId: id,
      action: "submit",
      user: author,
    });
    await fireWorkflowAction(payload, {
      instanceId: id,
      activity: "review",
      action: "claim",
      user: editor,
    });
    const state = await getWorkflowState(payload, {
      collection: "pages",
      id: page.id,
      user: author,
    });
    const view = state.instances.find((entry) => entry.id === id);
    expect(view?.waitingOn).toEqual({ users: [String(editor.id)], roles: [] });
    expect(view?.activities[0]?.assignee).toBe(String(editor.id));
    expect(view?.history.map((entry) => entry.actor.id).filter(Boolean)).toEqual([
      String(author.id),
      String(author.id),
      String(editor.id),
    ]);
    const inbox = await listWorkflowInstances(payload, { scope: "mine", user: editor });
    expect(inbox.docs.find((entry) => entry.id === id)?.waitingOn.users).toEqual([
      String(editor.id),
    ]);
  });

  it("deleting the subject aborts its active runs", async () => {
    const page = await createPage("Doomed");
    const run = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: author,
    });
    await payload.delete({ collection: "pages", id: page.id, overrideAccess: true });
    const doc = await instanceDoc(run.id as string);
    expect(doc.status).toBe("aborted");
    expect(doc.history.at(-1)).toMatchObject({ type: "aborted", reason: "Subject deleted" });
  });

  it("the instances collection cannot be written over the API", async () => {
    const page = await createPage("Locked");
    const run = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: author,
    });
    const id = run.id as string;
    await expect(
      payload.update({
        collection: SLUG as never,
        id,
        data: { stage: "approved" } as never,
        overrideAccess: false,
        user: editor,
      })
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      payload.delete({ collection: SLUG as never, id, overrideAccess: false, user: editor })
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      payload.create({
        collection: SLUG as never,
        data: {} as never,
        overrideAccess: false,
        user: editor,
      })
    ).rejects.toMatchObject({ status: 403 });
    expect((await instanceDoc(id)).stage).toBe("drafting");
    // Reading is allowed to any logged-in user.
    const read = await payload.findByID({
      collection: SLUG as never,
      id,
      overrideAccess: false,
      user: editor,
    });
    expect(read.id).toBeDefined();
  });
});
