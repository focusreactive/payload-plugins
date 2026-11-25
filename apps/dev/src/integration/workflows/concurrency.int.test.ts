import {
  WorkflowError,
  defineWorkflow,
  fireWorkflowAction,
  startWorkflow,
} from "@focus-reactive/payload-plugin-workflows";
import { commitTransaction, createLocalReq, initTransaction } from "payload";
import type { Payload, TypedUser } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ON_POSTGRES, bootWorkflowsPayload, historyOf } from "./bootWorkflowsPayload";
import type { HistoryRow, WorkflowsTestPayload } from "./bootWorkflowsPayload";

// Real races: every call below is an independent Local API call with its own request and its own
// transaction, started together with `Promise.all`, so the database decides who wins. Postgres only:
// SQLite serialises every writer on one file lock, so nothing interleaves and these would prove nothing.

const ROUNDS = 20;
const RACERS = 10;
const SLUG = "workflow-instances";

/** Two parallel tasks writing different fields; the stage closes once both are done. */
const race = defineWorkflow({
  name: "race",
  collections: ["pages"],
  initialStage: "open",
  fields: [
    { name: "a", type: "string" },
    { name: "b", type: "string" },
  ],
  stages: [
    {
      name: "open",
      activities: [
        {
          name: "left",
          actions: [{ name: "go", status: "done", set: { a: "left" }, effects: ["notify-author"] }],
        },
        { name: "right", actions: [{ name: "go", status: "done", set: { b: "right" } }] },
      ],
      transitions: [{ name: "both", to: "closed" }],
    },
    { name: "closed" },
  ],
});

/** Two actions of one task that exclude each other. */
const decide = defineWorkflow({
  name: "decide",
  collections: ["pages"],
  initialStage: "open",
  fields: [{ name: "verdict", type: "string" }],
  stages: [
    {
      name: "open",
      actions: [
        { name: "yes", status: "done", set: { verdict: "yes" } },
        { name: "no", status: "done", set: { verdict: "no" } },
      ],
      transitions: [{ name: "decided", to: "closed" }],
    },
    { name: "closed" },
  ],
});

/** A person approves while a save of the document settles the run (the `watch` auto action). */
const follow = defineWorkflow({
  name: "follow",
  collections: ["pages"],
  initialStage: "open",
  fields: [
    { name: "approved", type: "string" },
    { name: "seen", type: "string" },
  ],
  stages: [
    {
      name: "open",
      activities: [
        {
          name: "review",
          actions: [
            {
              name: "approve",
              status: "done",
              set: { approved: "yes" },
              effects: ["notify-author"],
            },
          ],
        },
        {
          name: "watch",
          actions: [
            {
              name: "saw",
              when: ({ doc }) => doc?.title === "Ready",
              status: "done",
              set: { seen: "yes" },
            },
          ],
        },
      ],
      transitions: [{ name: "both", to: "closed" }],
    },
    { name: "closed" },
  ],
});

/** One action queuing many effects on one run: their outcomes all write that run. */
const FANOUT = 20;
const fanout = defineWorkflow({
  name: "fanout",
  collections: ["pages"],
  initialStage: "open",
  stages: [
    {
      name: "open",
      actions: [
        { name: "go", effects: Array.from({ length: FANOUT }, () => "notify-author") },
        { name: "end", status: "done" },
      ],
      transitions: [{ name: "ended", to: "closed" }],
    },
    { name: "closed" },
  ],
});

interface RunRow {
  revision: number;
  status: string;
  stage: string;
  activeKey: string;
  fields: Record<string, unknown>;
  nextSeq: number;
  /** From the events collection, oldest first. */
  history: HistoryRow[];
}

let booted: WorkflowsTestPayload;
let payload: Payload;
let user: TypedUser;
let page = 0;
/** Writes the database refused: a run update whose `revision` had moved, a run insert whose `activeKey` was taken. */
const refused = { cas: 0, unique: 0 };

const createPage = async (title = `Page ${(page += 1)}`) =>
  payload.create({
    collection: "pages",
    data: { title } as never,
    draft: true,
    overrideAccess: true,
  });

/**
 * A run with its history. Every time: the history is numbered 1, 2, … with no gap and no repeat,
 * and the run's `nextSeq` follows the last entry, however the writers raced.
 */
const run = async (id: string): Promise<RunRow> => {
  const row = (await payload.findByID({
    collection: SLUG as never,
    id,
    depth: 0,
    overrideAccess: true,
  })) as unknown as RunRow;
  const history = await historyOf(payload, id);
  expect(history.map((entry) => entry.seq)).toEqual(history.map((_, i) => i + 1));
  expect(row.nextSeq).toBe(history.length + 1);
  return { ...row, history };
};

const startOn = async (workflow: string) => {
  const doc = await createPage();
  const view = await startWorkflow(payload, { workflow, collection: "pages", id: doc.id, user });
  return { doc, id: view.id as string };
};

/** The effect jobs queued for a run (kept after completion: `deleteJobOnComplete: false`). */
const effectJobs = async (instanceId: string) => {
  const jobs = await payload.find({
    collection: "payload-jobs",
    where: { taskSlug: { equals: "workflowsPluginEffect" } },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  });
  return jobs.docs.filter(
    (job) => (job.input as { instanceId?: string } | null)?.instanceId === instanceId
  );
};

/** `"ok"` for a call that went through, the `WorkflowError` code otherwise; anything else fails. */
const outcome = async (call: Promise<unknown>): Promise<string> => {
  try {
    await call;
    return "ok";
  } catch (error) {
    if (error instanceof WorkflowError) {
      return error.code;
    }
    throw error;
  }
};

const tally = (outcomes: string[], into: Map<string, number>) => {
  for (const code of outcomes) {
    into.set(code, (into.get(code) ?? 0) + 1);
  }
};

/** Prints what the rounds saw, so a run shows the races really went both ways. */
const report = (label: string, counts: Map<string, number>) => {
  const seen = JSON.stringify({ ...Object.fromEntries(counts), refused });
  process.stderr.write(`[concurrency] ${label} ${seen}\n`);
  refused.cas = 0;
  refused.unique = 0;
};

const actionsIn = (row: RunRow) =>
  row.history.filter((entry) => entry.type === "action").map((e) => `${e.activity}/${e.action}`);

/** The notify-author effect: queued with the action, then recorded done by the inline job run. */
const effectsIn = (row: RunRow) =>
  row.history.filter((entry) => entry.type === "effect").map((e) => `${e.effect}:${e.status}`);
const NOTIFIED = ["notify-author:queued", "notify-author:done"];

describe.skipIf(!ON_POSTGRES)(
  "concurrency on Postgres (skipped on SQLite: one writer at a time, nothing can interleave)",
  () => {
    beforeAll(async () => {
      booted = await bootWorkflowsPayload({
        workflows: [race, decide, follow, fanout],
        jobs: { deleteJobOnComplete: false },
      });
      ({ payload } = booted);
      const doc = await payload.create({
        collection: "users",
        data: { email: "racer@test.local", password: "test-password-1" } as never,
        overrideAccess: true,
      });
      user = { ...doc, collection: "users" } as unknown as TypedUser;
      // Count what the database itself turned away, to show the races reach it (not only the
      // engine's checks on an already-committed state).
      const { db } = payload;
      const updateOne = db.updateOne.bind(db);
      db.updateOne = (async (args: Parameters<typeof updateOne>[0]) => {
        const updated = await updateOne(args);
        if (args.collection === SLUG && args.where && !updated) {
          refused.cas += 1;
        }
        return updated;
      }) as typeof db.updateOne;
      const create = db.create.bind(db);
      db.create = (async (args: Parameters<typeof create>[0]) => {
        try {
          return await create(args);
        } catch (error) {
          if (args.collection === SLUG) {
            refused.unique += 1;
          }
          throw error;
        }
      }) as typeof db.create;
    });

    afterAll(async () => {
      await booted?.cleanup();
    });

    it("runs on Postgres", () => {
      expect(payload.db.name).toBe("postgres");
    });

    it(`${RACERS} identical fires: one changes the run, the rest are refused, one effect job`, async () => {
      const seen = new Map<string, number>();
      for (let round = 0; round < ROUNDS; round += 1) {
        const { id } = await startOn("race");
        const before = await run(id);
        const notifiedBefore = booted.notified.length;

        const outcomes = await Promise.all(
          Array.from({ length: RACERS }, () =>
            outcome(
              fireWorkflowAction(payload, { instanceId: id, activity: "left", action: "go", user })
            )
          )
        );
        tally(outcomes, seen);

        expect(outcomes.filter((o) => o === "ok")).toHaveLength(1);
        // A retry that finds the work already done is refused by the engine, not a `conflict`.
        expect(outcomes.filter((o) => o !== "ok")).toEqual(
          Array.from({ length: RACERS - 1 }, () => "activity-not-active")
        );
        const after = await run(id);
        expect(actionsIn(after)).toEqual(["left/go"]);
        expect(effectsIn(after)).toEqual(NOTIFIED);
        // One write for the action, one for the effect reporting back: nothing from the losers.
        expect(after.revision).toBe(before.revision + 2);
        expect(after.fields).toEqual({ a: "left" });
        expect(after.status).toBe("active");
        const jobs = await effectJobs(id);
        expect(jobs).toHaveLength(1);
        expect(booted.notified.length - notifiedBefore).toBe(1);
      }
      // Losers really raced the winner's write, not just a state it had already committed.
      expect(refused.cas).toBeGreaterThan(0);
      report(`identical fires x${ROUNDS}:`, seen);
    });

    it("two different actions: both land, in one order or the other, neither write is lost", async () => {
      const orders = new Map<string, number>();
      for (let round = 0; round < ROUNDS; round += 1) {
        const { id } = await startOn("race");
        const before = await run(id);

        const outcomes = await Promise.all(
          (["left", "right"] as const).map((activity) =>
            outcome(fireWorkflowAction(payload, { instanceId: id, activity, action: "go", user }))
          )
        );

        expect(outcomes).toEqual(["ok", "ok"]);
        const after = await run(id);
        const actions = actionsIn(after);
        expect([...actions].sort()).toEqual(["left/go", "right/go"]);
        tally([actions.join(" then ")], orders);
        expect(after.fields).toEqual({ a: "left", b: "right" });
        expect(after.stage).toBe("closed");
        expect(after.status).toBe("completed");
        expect(effectsIn(after)).toEqual(NOTIFIED);
        // One write per action, one for the effect reporting back.
        expect(after.revision).toBe(before.revision + 3);
        // The transition comes after both actions, whichever order they took.
        const types = after.history.map((entry) => entry.type).filter((t) => t !== "effect");
        expect(types.slice(-4)).toEqual(["action", "action", "transition", "completed"]);
      }
      report(`two actions x${ROUNDS}:`, orders);
    });

    it("two actions that exclude each other: exactly one wins, its write is the one kept", async () => {
      const seen = new Map<string, number>();
      for (let round = 0; round < ROUNDS; round += 1) {
        const { id } = await startOn("decide");

        const outcomes = await Promise.all(
          (["yes", "no"] as const).map((action) =>
            outcome(fireWorkflowAction(payload, { instanceId: id, action, user }))
          )
        );

        expect([...outcomes].sort()).toEqual(["instance-not-active", "ok"]);
        const winner = outcomes[0] === "ok" ? "yes" : "no";
        tally([`${winner} won`, ...outcomes.filter((o) => o !== "ok")], seen);
        const after = await run(id);
        expect(after.fields).toEqual({ verdict: winner });
        expect(actionsIn(after)).toEqual([`open/${winner}`]);
        expect(after.status).toBe("completed");
      }
      report(`exclusive actions x${ROUNDS}:`, seen);
    });

    it(`${RACERS} starts on one document: one active run, the rest are already-running`, async () => {
      const seen = new Map<string, number>();
      for (let round = 0; round < ROUNDS; round += 1) {
        const doc = await createPage();

        const outcomes = await Promise.all(
          Array.from({ length: RACERS }, () =>
            outcome(
              startWorkflow(payload, { workflow: "race", collection: "pages", id: doc.id, user })
            )
          )
        );
        tally(outcomes, seen);

        expect(outcomes.filter((o) => o === "ok")).toHaveLength(1);
        expect(outcomes.filter((o) => o !== "ok")).toEqual(
          Array.from({ length: RACERS - 1 }, () => "already-running")
        );
        const runs = await payload.find({
          collection: SLUG as never,
          where: { subjectId: { equals: String(doc.id) } },
          depth: 0,
          limit: 0,
          pagination: false,
          overrideAccess: true,
        });
        expect(runs.docs).toHaveLength(1);
        expect((runs.docs[0] as unknown as RunRow).status).toBe("active");
      }
      // The unique `activeKey` turned the late inserts away, not only the `isRunning` pre-check.
      expect(refused.unique).toBeGreaterThan(0);
      report(`starts x${ROUNDS}:`, seen);
    });

    it("a fire racing a save that settles the run: both land, the save never fails", async () => {
      const orders = new Map<string, number>();
      for (let round = 0; round < ROUNDS; round += 1) {
        const { doc, id } = await startOn("follow");
        const before = await run(id);

        const [saved, fired] = await Promise.all([
          payload
            .update({
              collection: "pages",
              id: doc.id,
              data: { title: "Ready" } as never,
              draft: true,
              overrideAccess: true,
            })
            .then(() => "ok")
            .catch((error: unknown) => `save failed: ${String(error)}`),
          // Staggered by 0-38 ms over the rounds so the fire lands before, during and after the
          // save's own transaction.
          new Promise((resolve) => {
            setTimeout(resolve, (round % 20) * 2);
          }).then(() =>
            outcome(
              fireWorkflowAction(payload, {
                instanceId: id,
                activity: "review",
                action: "approve",
                user,
              })
            )
          ),
        ]);

        expect(saved).toBe("ok");
        expect(fired).toBe("ok");
        const after = await run(id);
        const actions = actionsIn(after);
        tally([actions.join(" then ")], orders);
        expect([...actions].sort()).toEqual(["review/approve", "watch/saw"]);
        expect(after.fields).toEqual({ approved: "yes", seen: "yes" });
        expect(after.status).toBe("completed");
        expect(effectsIn(after)).toEqual(NOTIFIED);
        // The save's write, the fire's write, the effect reporting back.
        expect(after.revision).toBe(before.revision + 3);
        expect(await effectJobs(id)).toHaveLength(1);
      }
      report(`fire vs save x${ROUNDS}:`, orders);
    });

    it(`${FANOUT} effects of one run on concurrent runners: each handler once, every outcome recorded`, async () => {
      const { doc, id } = await startOn("fanout");
      // Queued inside a caller's transaction, so they wait for the runners.
      const req = await createLocalReq({ user }, payload);
      await initTransaction(req);
      await fireWorkflowAction(payload, { instanceId: id, action: "go", user, req });
      await commitTransaction(req);
      const jobIds = (await effectJobs(id)).map((job) => job.id);
      expect(jobIds).toHaveLength(FANOUT);
      const before = booted.notified.filter((subject) => subject === String(doc.id)).length;
      // Four runner passes at once, each over its own share of the jobs. (Not four passes over
      // the whole queue: Payload 3.90's job claim is a read then a write, so two passes can claim
      // the same job and run it twice, whatever the job does.)
      const shares = [0, 1, 2, 3].map((share) => jobIds.filter((_, index) => index % 4 === share));
      await Promise.all(
        shares.map((share) =>
          payload.jobs.run({
            queue: "workflows-plugin",
            where: { id: { in: share } },
            limit: share.length,
          })
        )
      );
      const handled = booted.notified.filter((subject) => subject === String(doc.id)).length;
      expect(handled - before).toBe(FANOUT);
      const jobs = await effectJobs(id);
      expect(jobs.filter((job) => job.completedAt)).toHaveLength(FANOUT);
      // No job failed: a lost race to record is retried by the recording, not by the job.
      expect(jobs.filter((job) => job.hasError || (job.totalTried ?? 0) > 1)).toEqual([]);
      const after = await run(id);
      const outcomes = effectsIn(after);
      expect(outcomes.filter((entry) => entry === "notify-author:queued")).toHaveLength(FANOUT);
      expect(outcomes.filter((entry) => entry === "notify-author:done")).toHaveLength(FANOUT);
      report(`${FANOUT} effects, 4 runners:`, new Map([["cas lost", refused.cas]]));
    });
  }
);
