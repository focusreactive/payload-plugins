import { beforeEach, describe, expect, it } from "vitest";

import type { TaskRunner } from "../TaskRunner.interface.js";
import type { TaskRunnerContext } from "../TaskRunnerProvider.interface.js";
import type { EnqueueAssignment, TaskEvent, TaskInput } from "../types.js";

const SLUG = "posts";

const input = (collectionId: string, targetLng: string): TaskInput => ({
  collectionSlug: SLUG,
  collectionId,
  sourceLng: "en",
  targetLng,
  strategy: "overwrite",
  publishOnTranslation: false,
});

type Addressed = { collectionSlug: string; collectionId: string; targetLng: string };

const addressOf = (target: Addressed): string =>
  `${target.collectionSlug}/${target.collectionId}/${target.targetLng}`;

const assignmentKey = (assignment: EnqueueAssignment): string =>
  `${assignment.handle}@${addressOf(assignment)}`;

type ReportState = TaskEvent["state"];

const isTerminal = (event: TaskEvent): boolean => event.state !== "queued";

const cancelledAndStillDelivered = (states: ReportState[]): boolean =>
  states.length === 2 && states.includes("cancelled") && states.includes("delivered");

const settle = (promise: Promise<unknown>): Promise<"resolved" | "rejected"> =>
  promise.then(() => "resolved" as const).catch(() => "rejected" as const);

type Reported = { assignment: EnqueueAssignment; event: TaskEvent };

const handlesOf = (answer: EnqueueAssignment[]): string[] => [
  ...new Set(answer.map((assignment) => assignment.handle)),
];

export type MakeTaskRunner = (
  report: TaskRunnerContext["report"]
) => TaskRunner | Promise<TaskRunner>;

/**
 * The obligations `TaskRunner` owes its callers, asserted against one implementation.
 *
 * Every check traces to a sentence of `TaskRunner.interface.ts`, `TaskRunnerProvider.interface.ts`
 * or `types.ts`; the nested `describe` names quote the obligation they belong to. Checks that need
 * a handle from a runner that answers `enqueue` with nothing skip themselves instead of failing.
 *
 * Nothing here waits for work to finish: a runner whose terminal events land after the call under
 * test resolves passes these checks vacuously.
 *
 * @param name - how the implementation under test is reported
 * @param make - called fresh for every check
 */
export function assertTaskRunnerContract(name: string, make: MakeTaskRunner): void {
  describe(name, () => {
    let runner: TaskRunner;
    let reported: Reported[] = [];
    // A real database keeps what earlier checks queued.
    let checkNumber = 0;
    const documentForThisCheck = (n: number): string => `doc-${checkNumber}-${n}`;

    const record: TaskRunnerContext["report"] = (_payload, assignment, event) => {
      reported.push({ assignment, event });
      return Promise.resolve();
    };

    beforeEach(async () => {
      checkNumber += 1;
      reported = [];
      runner = await make(record);
    });

    const enqueued = async (tasks: TaskInput[]): Promise<EnqueueAssignment[] | undefined> => {
      const answer = await runner.enqueue(tasks);
      return Array.isArray(answer) ? answer : undefined;
    };

    const twoLocales = (): TaskInput[] => [
      input(documentForThisCheck(1), "de"),
      input(documentForThisCheck(1), "fr"),
    ];

    const threeLocales = (): TaskInput[] => [
      input(documentForThisCheck(1), "de"),
      input(documentForThisCheck(1), "fr"),
      input(documentForThisCheck(2), "de"),
    ];

    const addressesReported = (state: ReportState): string[] =>
      reported
        .filter((entry) => entry.event.state === state)
        .map((entry) => addressOf(entry.assignment));

    const timesQueued = (address: string): number =>
      addressesReported("queued").filter((queued) => queued === address).length;

    const wasReported = (assignment: EnqueueAssignment, state: ReportState): boolean =>
      reported.some(
        (entry) =>
          entry.event.state === state &&
          assignmentKey(entry.assignment) === assignmentKey(assignment)
      );

    const terminalsPerAssignment = (): Array<[string, ReportState[]]> => {
      const collected = new Map<string, ReportState[]>();
      for (const { assignment, event } of reported) {
        if (!isTerminal(event)) continue;
        const key = assignmentKey(assignment);
        collected.set(key, [...(collected.get(key) ?? []), event.state]);
      }
      return [...collected];
    };

    describe("an empty request is answered, not refused", () => {
      it("answers an empty enqueue", async () => {
        const answer: unknown = await runner.enqueue([]);

        expect(answer ?? [], "enqueue([]) answers [] or nothing").toEqual([]);
      });

      it("answers an empty cancel", async () => {
        const answer: unknown = await runner.cancel([]);

        expect(answer ?? [], "cancel([]) answers [] or undefined").toEqual([]);
      });

      it("reports nothing about an empty enqueue", async () => {
        await runner.enqueue([]);

        expect(reported, "an empty request accepts no assignment to report").toEqual([]);
      });

      it("reports nothing about an empty cancel", async () => {
        await runner.cancel([]);

        expect(reported, "no handle names work to stop, so nothing settled").toEqual([]);
      });

      it("answers about no documents, not about all of them", async () => {
        expect(await runner.findByCollection(SLUG, [])).toEqual([]);
      });
    });

    describe("a handle is a non-empty string", () => {
      it("names each assignment with a non-empty handle", async (ctx) => {
        const answer = await enqueued(twoLocales());
        if (!answer) {
          ctx.skip();
          return;
        }

        const unusable = answer.filter((assignment) => assignment.handle.length === 0);

        expect(unusable, "a handle callers can store and hand back").toEqual([]);
      });

      it("takes its own handles back", async (ctx) => {
        const answer = await enqueued([input(documentForThisCheck(1), "de")]);
        if (!answer) {
          ctx.skip();
          return;
        }

        expect(
          await settle(runner.cancel(handlesOf(answer))),
          "cancel takes the runner's own handle back unchanged"
        ).toBe("resolved");
      });
    });

    describe("only what was asked for is answered", () => {
      it("answers only locales the request listed", async (ctx) => {
        const request = threeLocales();
        const answer = await enqueued(request);
        if (!answer) {
          ctx.skip();
          return;
        }
        const asked = new Set(request.map(addressOf));

        const unasked = answer.map(addressOf).filter((address) => !asked.has(address));

        expect(unasked, "every assignment names a locale the request listed").toEqual([]);
      });

      it("answers a locale at most once per document", async (ctx) => {
        const answer = await enqueued(threeLocales());
        if (!answer) {
          ctx.skip();
          return;
        }
        const addresses = answer.map(addressOf);

        expect(new Set(addresses).size, "no locale is announced twice for one document").toBe(
          addresses.length
        );
      });

      it("answers once although the request listed a locale twice", async (ctx) => {
        const twice = [input(documentForThisCheck(1), "de"), input(documentForThisCheck(1), "de")];
        const answer = await enqueued(twice);
        if (!answer) {
          ctx.skip();
          return;
        }
        const address = addressOf(twice[0]);

        const found = answer.filter((assignment) => addressOf(assignment) === address);

        expect(found.length, "a locale appears at most once per document").toBeLessThanOrEqual(1);
      });

      it("answers an assignment per requested locale", async (ctx) => {
        const request = threeLocales();
        const answer = await enqueued(request);
        if (!answer) {
          ctx.skip();
          return;
        }
        const assigned = new Set(answer.map(addressOf));

        const missing = [...new Set(request.map(addressOf))].filter(
          (address) => !assigned.has(address)
        );

        expect(missing, "an EnqueueAssignment per requested target locale").toEqual([]);
      });

      it("answers a locale an existing run already covers", async (ctx) => {
        const covered = input(documentForThisCheck(1), "de");
        const first = await enqueued([covered, input(documentForThisCheck(1), "fr")]);
        const again = first ? await enqueued([covered]) : undefined;
        if (!again) {
          ctx.skip();
          return;
        }

        expect(
          again.map(addressOf),
          "a locale an existing run covers is owed that run's handle"
        ).toContain(addressOf(covered));
      });
    });

    describe("what became of every accepted assignment reaches the plugin", () => {
      it("reports queued for every requested locale", async () => {
        const request = twoLocales();

        await runner.enqueue(request);

        const silent = [...new Set(request.map(addressOf))].filter(
          (address) => timesQueued(address) === 0
        );
        expect(silent, "queued is sent for every locale the runner accepted").toEqual([]);
      });

      it("reports queued at most once per requested locale", async () => {
        const request = twoLocales();

        await runner.enqueue(request);

        const repeated = [...new Set(request.map(addressOf))].filter(
          (address) => timesQueued(address) > 1
        );
        expect(repeated, "one queued per requested locale, not several").toEqual([]);
      });

      it("reports queued once although the request listed a locale twice", async () => {
        const twice = [input(documentForThisCheck(1), "de"), input(documentForThisCheck(1), "de")];

        await runner.enqueue(twice);

        expect(
          timesQueued(addressOf(twice[0])),
          "a locale listed twice is one piece of accepted work"
        ).toBeLessThanOrEqual(1);
      });

      it("reports only about locales the request listed", async () => {
        const request = twoLocales();
        const asked = new Set(request.map(addressOf));

        await runner.enqueue(request);

        const unasked = reported
          .map((entry) => addressOf(entry.assignment))
          .filter((address) => !asked.has(address));
        expect(unasked, "every report names a locale the request listed").toEqual([]);
      });

      it("reports no terminal event for a locale before its queued", async () => {
        await runner.enqueue(twoLocales());

        const premature = reported
          .filter(
            (entry, index) =>
              isTerminal(entry.event) &&
              !reported
                .slice(0, index)
                .some(
                  (earlier) =>
                    earlier.event.state === "queued" &&
                    addressOf(earlier.assignment) === addressOf(entry.assignment)
                )
          )
          .map((entry) => `${addressOf(entry.assignment)}:${entry.event.state}`);

        expect(premature, "queued comes before any terminal event for that locale").toEqual([]);
      });

      it("reports at most one terminal event per assignment", async () => {
        await runner.enqueue(twoLocales());

        const several = terminalsPerAssignment().filter(([, states]) => states.length > 1);

        expect(several, "one assignment settles once").toEqual([]);
      });
    });

    describe("cancelling reports what the run still owed", () => {
      it("reports cancelled for every locale the run still owed", async (ctx) => {
        const answer = await enqueued(twoLocales());
        if (!answer) {
          ctx.skip();
          return;
        }
        const owed = answer.filter(
          (assignment) =>
            !reported.some(
              (entry) =>
                isTerminal(entry.event) &&
                assignmentKey(entry.assignment) === assignmentKey(assignment)
            )
        );

        await runner.cancel(handlesOf(answer));

        const unheard = owed.filter((assignment) => !wasReported(assignment, "cancelled"));
        expect(unheard.map(addressOf), "cancelled for each locale the run still owed").toEqual([]);
      });

      it("reports cancelled for no locale the run had delivered", async (ctx) => {
        const answer = await enqueued(twoLocales());
        if (!answer) {
          ctx.skip();
          return;
        }
        const delivered = answer.filter((assignment) => wasReported(assignment, "delivered"));

        await runner.cancel(handlesOf(answer));

        const revoked = delivered.filter((assignment) => wasReported(assignment, "cancelled"));
        expect(revoked.map(addressOf), "a delivered locale is not reported cancelled").toEqual([]);
      });

      it("reports at most one terminal event per cancelled assignment", async (ctx) => {
        const answer = await enqueued(twoLocales());
        if (!answer) {
          ctx.skip();
          return;
        }

        await runner.cancel(handlesOf(answer));

        const several = terminalsPerAssignment().filter(
          ([, states]) => states.length > 1 && !cancelledAndStillDelivered(states)
        );
        expect(
          several,
          "one assignment settles once, bar a locale already executing when cancelled"
        ).toEqual([]);
      });

      it("reports nothing cancelled about a run whose handle it was not given", async (ctx) => {
        const spared = await enqueued([input(documentForThisCheck(1), "de")]);
        const cancelled = await enqueued([input(documentForThisCheck(2), "de")]);
        if (!spared || !cancelled) {
          ctx.skip();
          return;
        }
        const given = new Set(handlesOf(cancelled));
        const untouched = new Set(spared.filter((a) => !given.has(a.handle)).map(assignmentKey));

        await runner.cancel([...given]);

        const strays = reported.filter(
          (entry) =>
            entry.event.state === "cancelled" && untouched.has(assignmentKey(entry.assignment))
        );
        expect(
          strays.map((entry) => addressOf(entry.assignment)),
          "cancel stops the work these handles stand for, not another run's"
        ).toEqual([]);
      });
    });

    describe("a handle that no longer names anything is an answer, not a failure", () => {
      /**
       * A handle this runner issued and then had cancelled. Unknown now, and shaped the way this
       * runner shapes handles — which is as far as the obligations reach: a store may reject a
       * value it could never have produced, and on SQL a non-numeric handle does exactly that.
       */
      const spent = async (): Promise<string | undefined> => {
        const answer = await enqueued([input(documentForThisCheck(9), "de")]);
        const handle = answer?.[0]?.handle;
        if (handle) await runner.cancel([handle]);
        return handle;
      };

      it("answers run on a spent handle with not_found", async (ctx) => {
        const handle = await spent();
        if (!handle) {
          ctx.skip();
          return;
        }

        expect(await runner.run(handle)).toEqual({ success: false, error: "not_found" });
      });

      it("resolves cancel on a spent handle", async (ctx) => {
        const handle = await spent();
        if (!handle) {
          ctx.skip();
          return;
        }

        expect(
          await settle(runner.cancel([handle])),
          "cancel on a spent handle resolves rather than rejecting"
        ).toBe("resolved");
      });
    });

    describe("findByCollection finds tasks for a collection", () => {
      it("answers only tasks of the collection asked about", async () => {
        await runner.enqueue([input(documentForThisCheck(1), "de")]);

        const tasks = await runner.findByCollection(SLUG);

        expect(
          tasks.filter((task) => task.input.collectionSlug !== SLUG),
          "every task belongs to the collection asked about"
        ).toEqual([]);
      });

      it("keeps only the documents the filter names", async () => {
        const kept = documentForThisCheck(1);
        await runner.enqueue([input(kept, "de"), input(documentForThisCheck(2), "de")]);

        const tasks = await runner.findByCollection(SLUG, { documentIds: [kept] });

        expect(
          tasks.filter((task) => task.input.collectionId !== kept),
          "documentIds keeps only tasks for these documents"
        ).toEqual([]);
      });

      it("keeps only the documents the deprecated array names", async () => {
        const kept = documentForThisCheck(1);
        await runner.enqueue([input(kept, "de"), input(documentForThisCheck(2), "de")]);

        const tasks = await runner.findByCollection(SLUG, [kept]);

        expect(
          tasks.filter((task) => task.input.collectionId !== kept),
          "the array means what { documentIds } means"
        ).toEqual([]);
      });

      it("drops tasks that have finished", async () => {
        await runner.enqueue([input(documentForThisCheck(1), "de")]);

        const tasks = await runner.findByCollection(SLUG, { excludeCompleted: true });

        expect(
          tasks.filter((task) => task.status === "completed"),
          "excludeCompleted drops tasks that have finished"
        ).toEqual([]);
      });
    });
  });
}
