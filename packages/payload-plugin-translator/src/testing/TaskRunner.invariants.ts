import { beforeEach, describe, expect, it } from "vitest";

import type { TaskRunner } from "../server/modules/task-runner/TaskRunner.interface.js";
import type { TaskRunnerContext } from "../server/modules/task-runner/TaskRunnerProvider.interface.js";
import type { RunnerCapabilities } from "../server/modules/task-runner/RunnerCapabilities.js";
import type {
  EnqueueAssignment,
  TaskEvent,
  TaskInput,
  RunRef,
} from "../server/modules/task-runner/types.js";
import type { AuthorisedHandle, AuthorisedWork } from "../server/shared/access/authorised.js";

const SLUG = "posts";

const asWork = (task: TaskInput): AuthorisedWork => task as AuthorisedWork;
const asHandle = (handle: string): AuthorisedHandle => handle as AuthorisedHandle;

const input = (collectionId: string, targetLng: string): AuthorisedWork =>
  asWork({
    collectionSlug: SLUG,
    collectionId,
    sourceLng: "en",
    targetLng,
    publishOnTranslation: false,
  });

type Addressed = { collectionSlug: string; collectionId: string; targetLng: string };

const addressOf = (target: Addressed): string =>
  `${target.collectionSlug}/${target.collectionId}/${target.targetLng}`;

const runKey = (run: RunRef): string => `${run.handle}@${run.targetLng}`;

const refOf = (assignment: EnqueueAssignment): RunRef => ({
  handle: assignment.handle,
  targetLng: assignment.targetLng,
});

type ReportState = TaskEvent["state"];

const isTerminal = (event: TaskEvent): boolean => event.state !== "queued";

const cancelledAndStillDelivered = (states: ReportState[]): boolean =>
  states.length === 2 && states.includes("cancelled") && states.includes("delivered");

const settle = async (promise: Promise<unknown>): Promise<"resolved" | "rejected"> => {
  try {
    await promise;
    return "resolved";
  } catch {
    return "rejected";
  }
};

type Reported = { run: RunRef; event: TaskEvent };

const handlesOf = (answer: EnqueueAssignment[]): AuthorisedHandle[] =>
  [...new Set(answer.map((assignment) => assignment.handle))].map(asHandle);

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
 * Importing this module loads `vitest`, so it belongs in a test file; a non-test module that
 * imports it fails at load, not at the call.
 *
 * The checks for `stop` and `run` are registered only when the provider declares those
 * capabilities, and the suite first asserts that what it declares, the runner implements.
 *
 * @param name - how the implementation under test is reported
 * @param make - called fresh for every check
 * @since 1.0.0
 */
export function assertTaskRunnerContract(
  name: string,
  make: MakeTaskRunner,
  capabilities: RunnerCapabilities
): void {
  describe(name, () => {
    let runner: TaskRunner;
    let reported: Reported[] = [];
    // A real database keeps what earlier checks queued.
    let checkNumber = 0;
    const documentForThisCheck = (n: number): string => `doc-${checkNumber}-${n}`;

    const record: TaskRunnerContext["report"] = (_payload, run, event) => {
      reported.push({ run, event });
      return Promise.resolve();
    };

    beforeEach(async () => {
      checkNumber += 1;
      reported = [];
      runner = await make(record);
    });

    const enqueued = async (tasks: AuthorisedWork[]): Promise<EnqueueAssignment[] | undefined> => {
      const answer = await runner.enqueue(tasks);
      return Array.isArray(answer) ? answer : undefined;
    };

    const twoLocales = (): AuthorisedWork[] => [
      input(documentForThisCheck(1), "de"),
      input(documentForThisCheck(1), "fr"),
    ];

    const threeLocales = (): AuthorisedWork[] => [
      input(documentForThisCheck(1), "de"),
      input(documentForThisCheck(1), "fr"),
      input(documentForThisCheck(2), "de"),
    ];

    const timesReported = (run: RunRef, state: ReportState): number =>
      reported.filter((entry) => entry.event.state === state && runKey(entry.run) === runKey(run))
        .length;

    const wasReported = (assignment: EnqueueAssignment, state: ReportState): boolean =>
      timesReported(refOf(assignment), state) > 0;

    const terminalsPerAssignment = (): Array<[string, ReportState[]]> => {
      const collected = new Map<string, ReportState[]>();
      for (const { run, event } of reported) {
        if (!isTerminal(event)) continue;
        const key = runKey(run);
        collected.set(key, [...(collected.get(key) ?? []), event.state]);
      }
      return [...collected];
    };

    describe("a runner does what its provider says it does", () => {
      it("implements every capability the provider declares, and nothing it denies", () => {
        expect(
          { stop: typeof runner.stop === "function", run: typeof runner.run === "function" },
          "a declared capability decides whether a route exists, so it cannot be a wish"
        ).toEqual({ stop: capabilities.stop, run: capabilities.run });
      });
    });

    describe("the plugin's record of the run is load-bearing", () => {
      it("lets a failing queued report out of enqueue", async () => {
        // Only `queued` refuses: a runner whose terminal reports also failed would reject for that
        // reason instead, and the check would pass over a runner that swallows this one.
        const strict = await make((_payload, _assignment, event) =>
          event.state === "queued"
            ? Promise.reject(new Error("the run was not recorded"))
            : Promise.resolve()
        );

        const outcome = await settle(Promise.resolve(strict.enqueue(twoLocales())));

        expect(outcome, "a run nothing recorded must not answer as queued").toBe("rejected");
      });
    });

    describe("an empty request is answered, not refused", () => {
      it("answers an empty enqueue", async () => {
        const answer: unknown = await runner.enqueue([]);

        expect(answer ?? [], "enqueue([]) answers [] or nothing").toEqual([]);
      });

      it("reports nothing about an empty enqueue", async () => {
        await runner.enqueue([]);

        expect(reported, "an empty request accepts no assignment to report").toEqual([]);
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
      it("reports queued for every locale it accepted", async (ctx) => {
        const answer = await enqueued(twoLocales());
        if (!answer) {
          ctx.skip();
          return;
        }

        const silent = answer.filter((entry) => timesReported(refOf(entry), "queued") === 0);
        expect(
          silent.map(addressOf),
          "queued is sent for every locale the runner accepted"
        ).toEqual([]);
      });

      it("reports queued at most once per accepted locale", async (ctx) => {
        const answer = await enqueued(twoLocales());
        if (!answer) {
          ctx.skip();
          return;
        }

        const repeated = answer.filter((entry) => timesReported(refOf(entry), "queued") > 1);
        expect(repeated.map(addressOf), "one queued per locale, not several").toEqual([]);
      });

      it("reports queued once although the request listed a locale twice", async (ctx) => {
        const twice = [input(documentForThisCheck(1), "de"), input(documentForThisCheck(1), "de")];
        const answer = await enqueued(twice);
        if (!answer || answer.length === 0) {
          ctx.skip();
          return;
        }

        expect(
          timesReported(refOf(answer[0]), "queued"),
          "a locale listed twice is one piece of accepted work"
        ).toBeLessThanOrEqual(1);
      });

      it("reports only about locales the request listed", async () => {
        const request = twoLocales();
        const asked = new Set(request.map((task) => task.targetLng));

        await runner.enqueue(request);

        const unasked = reported
          .map((entry) => entry.run.targetLng)
          .filter((targetLng) => !asked.has(targetLng));
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
                    earlier.event.state === "queued" && runKey(earlier.run) === runKey(entry.run)
                )
          )
          .map((entry) => `${runKey(entry.run)}:${entry.event.state}`);

        expect(premature, "queued comes before any terminal event for that locale").toEqual([]);
      });

      it("reports at most one terminal event per assignment", async () => {
        await runner.enqueue(twoLocales());

        const several = terminalsPerAssignment().filter(([, states]) => states.length > 1);

        expect(several, "one assignment settles once").toEqual([]);
      });
    });

    const stopping = capabilities.stop
      ? (handles: AuthorisedHandle[]) => (runner.stop as NonNullable<TaskRunner["stop"]>)(handles)
      : undefined;

    describe.runIf(capabilities.stop)("stopping is answered, not refused", () => {
      it("answers an empty stop", async () => {
        const answer: unknown = await stopping?.([]);

        expect(answer ?? [], "stop([]) answers [] or undefined").toEqual([]);
      });

      it("reports nothing about an empty stop", async () => {
        await stopping?.([]);

        expect(reported, "no handle names work to stop, so nothing settled").toEqual([]);
      });

      it("takes its own handles back", async (ctx) => {
        const answer = await enqueued([input(documentForThisCheck(1), "de")]);
        if (!answer) {
          ctx.skip();
          return;
        }

        expect(
          await settle(Promise.resolve(stopping?.(handlesOf(answer)))),
          "stop takes the runner's own handle back unchanged"
        ).toBe("resolved");
      });
    });

    describe.runIf(capabilities.stop)("stopping reports what the run still owed", () => {
      it("reports cancelled for every locale the run still owed", async (ctx) => {
        const answer = await enqueued(twoLocales());
        if (!answer) {
          ctx.skip();
          return;
        }
        const owed = answer.filter(
          (assignment) =>
            !reported.some(
              (entry) => isTerminal(entry.event) && runKey(entry.run) === runKey(refOf(assignment))
            )
        );

        await stopping?.(handlesOf(answer));

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

        await stopping?.(handlesOf(answer));

        const revoked = delivered.filter((assignment) => wasReported(assignment, "cancelled"));
        expect(revoked.map(addressOf), "a delivered locale is not reported cancelled").toEqual([]);
      });

      it("reports at most one terminal event per cancelled assignment", async (ctx) => {
        const answer = await enqueued(twoLocales());
        if (!answer) {
          ctx.skip();
          return;
        }

        await stopping?.(handlesOf(answer));

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
        const untouched = new Set(
          spared.filter((a) => !given.has(asHandle(a.handle))).map((a) => runKey(refOf(a)))
        );

        await stopping?.([...given]);

        const strays = reported.filter(
          (entry) => entry.event.state === "cancelled" && untouched.has(runKey(entry.run))
        );
        expect(
          strays.map((entry) => runKey(entry.run)),
          "cancel stops the work these handles stand for, not another run's"
        ).toEqual([]);
      });
    });

    describe.runIf(capabilities.stop && capabilities.run)(
      "a handle that no longer names anything is an answer, not a failure",
      () => {
        /**
         * A handle this runner issued and then had cancelled — a made-up one would be rejected by
         * the store rather than answered `not_found` (see `TaskRunner.interface.ts`).
         */
        const spent = async (): Promise<string | undefined> => {
          const answer = await enqueued([input(documentForThisCheck(1), "de")]);
          const handle = answer?.[0]?.handle;
          if (handle) await stopping?.([asHandle(handle)]);
          return handle;
        };

        it("answers run on a spent handle with not_found", async (ctx) => {
          const handle = await spent();
          if (!handle) {
            ctx.skip();
            return;
          }

          expect(await runner.run?.(asHandle(handle))).toEqual({
            success: false,
            error: "not_found",
          });
        });

        it("resolves stop on a spent handle", async (ctx) => {
          const handle = await spent();
          if (!handle) {
            ctx.skip();
            return;
          }

          expect(
            await settle(Promise.resolve(stopping?.([asHandle(handle)]))),
            "stop on a spent handle resolves rather than rejecting"
          ).toBe("resolved");
        });
      }
    );
  });
}
