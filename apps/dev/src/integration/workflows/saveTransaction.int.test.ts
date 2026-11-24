import {
  WorkflowError,
  defineWorkflow,
  startWorkflow,
} from "@focus-reactive/payload-plugin-workflows";
import { commitTransaction, createLocalReq, initTransaction, killTransaction } from "payload";
import type { Payload, TypedUser } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ON_POSTGRES, autoStart, bootWorkflowsPayload } from "./bootWorkflowsPayload";
import type { WorkflowsTestPayload } from "./bootWorkflowsPayload";

// A workflow error in a save's hooks is logged and the save goes on, unless the error ended the
// save's transaction: then the save's changes are already rolled back, and the save must fail
// instead of reporting success. These tests break the runs' writes on purpose.

const SLUG = "workflow-instances";
const NOT_SAVED = /The document was not saved/u;

/** Moves (and writes its run) once the document's title is "Ready". */
const follow = defineWorkflow({
  name: "follow",
  collections: ["pages"],
  initialStage: "open",
  fields: [{ name: "seen", type: "string" }],
  stages: [
    {
      name: "open",
      actions: [
        {
          name: "saw",
          when: ({ doc }) => doc?.title === "Ready",
          status: "done",
          set: { seen: "yes" },
        },
      ],
      transitions: [{ name: "seen", to: "closed" }],
    },
    { name: "closed" },
  ],
});

/** A condition that throws once the title is "Boom": a logic error, before any write. */
const brittle = defineWorkflow({
  name: "brittle",
  collections: ["pages"],
  initialStage: "open",
  stages: [
    {
      name: "open",
      actions: [
        {
          name: "check",
          when: ({ doc }) => {
            if (doc?.title === "Boom") {
              throw new Error("condition blew up");
            }
            return false;
          },
        },
        { name: "finish", status: "done" },
      ],
      transitions: [{ name: "finished", to: "closed" }],
    },
    { name: "closed" },
  ],
});

let booted: WorkflowsTestPayload;
let payload: Payload;
let user: TypedUser;
const restore: (() => void)[] = [];

/** Replaces one adapter method for the rest of the test. */
const patchDb = <K extends "create" | "findOne" | "updateOne">(
  method: K,
  wrap: (original: Payload["db"][K]) => Payload["db"][K]
) => {
  const original = payload.db[method];
  payload.db[method] = wrap(original.bind(payload.db) as Payload["db"][K]);
  restore.push(() => {
    payload.db[method] = original;
  });
};

const onRuns = (args: unknown) => (args as { collection?: string }).collection === SLUG;

beforeAll(async () => {
  booted = await bootWorkflowsPayload({ workflows: [follow, brittle, autoStart] });
  ({ payload } = booted);
  const doc = await payload.create({
    collection: "users",
    data: { email: "tx@test.local", password: "test-password-1" } as never,
    overrideAccess: true,
  });
  user = { ...doc, collection: "users" } as unknown as TypedUser;
});

afterEach(() => {
  for (const undo of restore.splice(0).reverse()) {
    undo();
  }
  vi.restoreAllMocks();
});

afterAll(async () => {
  await booted?.cleanup();
});

const createPage = (title: string) =>
  payload.create({
    collection: "pages",
    data: { title } as never,
    draft: true,
    overrideAccess: true,
  });

const titleOf = async (id: string | number) =>
  (
    (await payload.findByID({ collection: "pages", id, draft: true, overrideAccess: true })) as {
      title?: string;
    }
  ).title;

const runOf = async (id: string | undefined) =>
  (await payload.findByID({
    collection: SLUG as never,
    id: String(id),
    overrideAccess: true,
  })) as unknown as {
    stage: string;
    revision: number;
  };

/** A followed page whose next save to "Ready" writes its run. */
const followedPage = async () => {
  const page = await createPage("Draft");
  const run = await startWorkflow(payload, {
    workflow: "follow",
    collection: "pages",
    id: page.id,
    user,
  });
  return { page, run };
};

const saveReady = (id: string | number) =>
  payload.update({
    collection: "pages",
    id,
    data: { title: "Ready" } as never,
    draft: true,
    overrideAccess: true,
  });

describe("a workflow write fails during a save", () => {
  it("rejects the save when the run's database write throws, and keeps the document as it was", async () => {
    const { page, run } = await followedPage();
    patchDb(
      "updateOne",
      (updateOne) =>
        (async (args) => {
          if (onRuns(args)) {
            throw new Error("injected run write failure");
          }
          return updateOne(args);
        }) as Payload["db"]["updateOne"]
    );

    await expect(saveReady(page.id)).rejects.toThrow(NOT_SAVED);
    restore.splice(0).forEach((undo) => undo());
    expect(await titleOf(page.id)).toBe("Draft");
    expect((await runOf(run.id)).stage).toBe("open");
  });

  it("rejects the save when a Payload operation of the hook fails (it rolls the transaction back)", async () => {
    const { page, run } = await followedPage();
    // `loadRun` (inside `mutateRun`) is a `findByID`: Payload kills `req`'s transaction when it throws.
    patchDb(
      "findOne",
      (findOne) =>
        (async (args) => {
          if (onRuns(args)) {
            throw new Error("injected run read failure");
          }
          return findOne(args);
        }) as Payload["db"]["findOne"]
    );

    await expect(saveReady(page.id)).rejects.toThrow(NOT_SAVED);
    restore.splice(0).forEach((undo) => undo());
    expect(await titleOf(page.id)).toBe("Draft");
    expect((await runOf(run.id)).stage).toBe("open");
  });

  it.runIf(ON_POSTGRES)(
    "rejects the save when the run's write fails in SQL (Postgres aborts the transaction)",
    async () => {
      const { page, run } = await followedPage();
      // A real statement error: the transaction stays registered, but COMMIT would roll it back.
      patchDb(
        "updateOne",
        (updateOne) =>
          (async (args) =>
            updateOne(
              onRuns(args) ? { ...args, data: { ...args.data, revision: "not a number" } } : args
            )) as Payload["db"]["updateOne"]
      );

      await expect(saveReady(page.id)).rejects.toThrow(NOT_SAVED);
      restore.splice(0).forEach((undo) => undo());
      expect(await titleOf(page.id)).toBe("Draft");
      expect((await runOf(run.id)).stage).toBe("open");
    }
  );

  it("rejects a create whose auto-started run cannot be written, and leaves no document", async () => {
    patchDb(
      "create",
      (create) =>
        (async (args) => {
          if (onRuns(args)) {
            throw new Error("injected run insert failure");
          }
          return create(args);
        }) as Payload["db"]["create"]
    );

    await expect(createPage("Auto")).rejects.toThrow(NOT_SAVED);
    restore.splice(0).forEach((undo) => undo());
    const left = await payload.find({
      collection: "pages",
      where: { title: { equals: "Auto" } },
      draft: true,
      overrideAccess: true,
    });
    expect(left.totalDocs).toBe(0);
  });

  it("rejects a move to the trash whose run cannot be aborted, and keeps the document", async () => {
    const { page, run } = await followedPage();
    patchDb(
      "updateOne",
      (updateOne) =>
        (async (args) => {
          if (onRuns(args)) {
            throw new Error("injected abort failure");
          }
          return updateOne(args);
        }) as Payload["db"]["updateOne"]
    );

    await expect(
      payload.update({
        collection: "pages",
        id: page.id,
        data: { deletedAt: new Date().toISOString() } as never,
        overrideAccess: true,
      })
    ).rejects.toThrow(NOT_SAVED);
    restore.splice(0).forEach((undo) => undo());
    const back = (await payload.findByID({
      collection: "pages",
      id: page.id,
      trash: true,
      overrideAccess: true,
    })) as { deletedAt?: string | null };
    expect(back.deletedAt ?? null).toBeNull();
    expect((await runOf(run.id)).stage).toBe("open");
  });
});

describe("a workflow logic error during a save", () => {
  it("is logged and the save succeeds with its content", async () => {
    const page = await createPage("Calm");
    await startWorkflow(payload, { workflow: "brittle", collection: "pages", id: page.id, user });
    const error = vi.spyOn(payload.logger, "error");

    await payload.update({
      collection: "pages",
      id: page.id,
      data: { title: "Boom" } as never,
      draft: true,
      overrideAccess: true,
    });

    expect(await titleOf(page.id)).toBe("Boom");
    const messages = error.mock.calls.map((call) => JSON.stringify(call[0]));
    expect(messages.some((msg) => msg.includes("could not settle run"))).toBe(true);
    expect(messages.some((msg) => msg.includes("failing the save"))).toBe(false);
  });
});

describe("startWorkflow inside a caller's transaction", () => {
  it("says the transaction was rolled back when it loses the race on the unique index", async () => {
    const page = await createPage("Raced");
    await startWorkflow(payload, { workflow: "follow", collection: "pages", id: page.id, user });

    const req = await createLocalReq({ user }, payload);
    await initTransaction(req);
    const mine = await payload.create({
      collection: "posts",
      data: { title: "written before the start" } as never,
      overrideAccess: true,
      req,
    });
    // Lose the race: the pre-check sees no run (as if the other start had not committed yet).
    const find = payload.find.bind(payload);
    payload.find = (async (args: Parameters<Payload["find"]>[0]) =>
      args.collection === SLUG && JSON.stringify(args.where).includes("activeKey")
        ? { docs: [], totalDocs: 0 }
        : find(args)) as Payload["find"];
    restore.push(() => {
      payload.find = find as Payload["find"];
    });

    const error = await startWorkflow(payload, {
      workflow: "follow",
      collection: "pages",
      id: page.id,
      user,
      req,
    }).catch((caught: unknown) => caught);
    restore.splice(0).forEach((undo) => undo());

    expect(error).toBeInstanceOf(WorkflowError);
    expect((error as WorkflowError).code).toBe("already-running");
    expect((error as WorkflowError).message).toMatch(/rolled back the request's transaction/u);
    await commitTransaction(req).catch(() => killTransaction(req));
    const kept = await payload.findByID({
      collection: "posts",
      id: mine.id,
      disableErrors: true,
      overrideAccess: true,
    });
    expect(kept).toBeNull();
  });

  it("keeps the transaction when the pre-check finds the run (no unique violation reached)", async () => {
    const page = await createPage("Checked");
    await startWorkflow(payload, { workflow: "follow", collection: "pages", id: page.id, user });

    const req = await createLocalReq({ user }, payload);
    await initTransaction(req);
    const mine = await payload.create({
      collection: "posts",
      data: { title: "survives" } as never,
      overrideAccess: true,
      req,
    });
    const error = await startWorkflow(payload, {
      workflow: "follow",
      collection: "pages",
      id: page.id,
      user,
      req,
    }).catch((caught: unknown) => caught);

    expect((error as WorkflowError).code).toBe("already-running");
    expect((error as WorkflowError).message).not.toMatch(/rolled back/u);
    await commitTransaction(req);
    const kept = await payload.findByID({
      collection: "posts",
      id: mine.id,
      disableErrors: true,
      overrideAccess: true,
    });
    expect(kept).not.toBeNull();
  });
});
