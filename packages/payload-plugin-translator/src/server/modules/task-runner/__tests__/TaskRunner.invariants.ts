import { beforeEach, describe, expect, it } from "vitest";

import type { TaskRunner } from "../TaskRunner.interface.js";
import type { EnqueueAssignment, TaskInput } from "../types.js";

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

const localeOf = (handle: string, targetLng: string): string => `${handle}/${targetLng}`;

const settle = (promise: Promise<unknown>): Promise<"resolved" | "rejected"> =>
  promise.then(() => "resolved" as const).catch(() => "rejected" as const);

/**
 * The obligations `TaskRunner` owes its callers, asserted against one implementation.
 *
 * Every check traces to a sentence of `TaskRunner.interface.ts` or `types.ts`; the nested
 * `describe` names quote the obligation they belong to. Checks that need the optional
 * `findByIds`, or a handle from a runner that answers `enqueue` with nothing, skip themselves
 * instead of failing.
 *
 * @param name - how the implementation under test is reported
 * @param make - builds a ready-to-use runner; called fresh for every check
 */
export function assertTaskRunnerContract(
  name: string,
  make: () => TaskRunner | Promise<TaskRunner>
): void {
  describe(name, () => {
    let runner: TaskRunner;
    // A real database keeps what earlier checks queued.
    let checkNumber = 0;
    const documentForThisCheck = (n: number): string => `doc-${checkNumber}-${n}`;

    beforeEach(async () => {
      checkNumber += 1;
      runner = await make();
    });

    const enqueued = async (tasks: TaskInput[]): Promise<EnqueueAssignment[] | undefined> => {
      const answer = await runner.enqueue(tasks);
      return Array.isArray(answer) ? answer : undefined;
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

      it("answers an empty findByIds", async (ctx) => {
        const findByIds = runner.findByIds?.bind(runner);
        if (!findByIds) {
          ctx.skip();
          return;
        }

        const answer: unknown = await findByIds([]);

        expect(answer ?? [], "findByIds([]) answers [] or undefined").toEqual([]);
      });

      it("answers about no documents, not about all of them", async () => {
        expect(await runner.findByCollection(SLUG, [])).toEqual([]);
      });
    });

    describe("a handle is a non-empty string", () => {
      it("names each assignment with a non-empty handle", async (ctx) => {
        const answer = await enqueued([
          input(documentForThisCheck(1), "de"),
          input(documentForThisCheck(1), "fr"),
        ]);
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
        const handles = [...new Set(answer.map((assignment) => assignment.handle))];

        expect(
          await settle(runner.cancel(handles)),
          "cancel takes the runner's own handle back unchanged"
        ).toBe("resolved");
      });
    });

    describe("only what was asked for is answered", () => {
      const request = [
        input(documentForThisCheck(1), "de"),
        input(documentForThisCheck(1), "fr"),
        input(documentForThisCheck(2), "de"),
      ];

      it("answers only locales the request listed", async (ctx) => {
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
        const answer = await enqueued(request);
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

      it("cancels nothing when the handle is spent", async (ctx) => {
        const findByIds = runner.findByIds?.bind(runner);
        const stale = await spent();
        const answer = await enqueued([input(documentForThisCheck(1), "de")]);
        if (!findByIds || !answer || !stale) {
          ctx.skip();
          return;
        }
        const handles = [...new Set(answer.map((assignment) => assignment.handle))];

        await runner.cancel([stale]);
        const cancelled = (await findByIds(handles)).filter((task) => task.cancelled);

        expect(cancelled, "cancel on a spent handle changes nothing").toEqual([]);
      });
    });

    describe("findByIds resolves handles to the tasks they stand for", () => {
      it("answers only tasks for the handles asked about", async (ctx) => {
        const findByIds = runner.findByIds?.bind(runner);
        const answer = await enqueued([input(documentForThisCheck(1), "de")]);
        if (!findByIds || !answer) {
          ctx.skip();
          return;
        }
        const handles = new Set(answer.map((assignment) => assignment.handle));

        const foreign = (await findByIds([...handles])).filter((task) => !handles.has(task.id));

        expect(foreign, "every task stands for one of the handles asked about").toEqual([]);
      });

      it("announces each target locale of a handle separately", async (ctx) => {
        const findByIds = runner.findByIds?.bind(runner);
        const answer = await enqueued([
          input(documentForThisCheck(1), "de"),
          input(documentForThisCheck(1), "fr"),
        ]);
        if (!findByIds || !answer) {
          ctx.skip();
          return;
        }
        const handles = [...new Set(answer.map((assignment) => assignment.handle))];
        const tasks = await findByIds(handles);
        const announced = new Set(tasks.map((task) => localeOf(task.id, task.input.targetLng)));

        const missing = answer
          .map((assignment) => localeOf(assignment.handle, assignment.targetLng))
          .filter((locale) => !announced.has(locale));

        expect(missing, "one Task per handle and target locale").toEqual([]);
      });

      it("announces a target locale once per handle", async (ctx) => {
        const findByIds = runner.findByIds?.bind(runner);
        const answer = await enqueued([
          input(documentForThisCheck(1), "de"),
          input(documentForThisCheck(1), "fr"),
        ]);
        if (!findByIds || !answer) {
          ctx.skip();
          return;
        }
        const handles = [...new Set(answer.map((assignment) => assignment.handle))];

        const tasks = await findByIds(handles);
        const locales = tasks.map((task) => localeOf(task.id, task.input.targetLng));
        const announcedOnce = new Set(locales).size;

        expect(announcedOnce, "one Task per handle and target locale").toBe(locales.length);
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
        await runner.enqueue([
          input(documentForThisCheck(1), "de"),
          input(documentForThisCheck(2), "de"),
        ]);

        const tasks = await runner.findByCollection(SLUG, { documentIds: ["doc-1"] });

        expect(
          tasks.filter((task) => task.input.collectionId !== "doc-1"),
          "documentIds keeps only tasks for these documents"
        ).toEqual([]);
      });

      it("keeps only the documents the deprecated array names", async () => {
        await runner.enqueue([
          input(documentForThisCheck(1), "de"),
          input(documentForThisCheck(2), "de"),
        ]);

        const tasks = await runner.findByCollection(SLUG, ["doc-1"]);

        expect(
          tasks.filter((task) => task.input.collectionId !== "doc-1"),
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
