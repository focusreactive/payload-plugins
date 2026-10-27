/** Never imported and never run: `check-types` fails if any `@ts-expect-error` below stops being an error. */

import type { TaskRunner } from "../../../modules/task-runner/TaskRunner.interface.js";
import type { TaskInput } from "../../../modules/task-runner/types.js";
import type { AuthorisedHandle, AuthorisedWork } from "../authorised.js";
import { scopeOf } from "../../payload/identityOf.js";
import type { Identity } from "../../payload/identityOf.js";

declare const runner: TaskRunner;
declare const work: TaskInput[];
declare const handle: string;

// @ts-expect-error work reaches the queue only once the rules have been asked about its document
runner.enqueue(work);

// @ts-expect-error work is stopped only once the rules have been asked about its document
runner.stop?.([handle]);

// @ts-expect-error a job is run only once the rules have been asked about its document
runner.run?.(handle);

declare const unnameable: { kind: "unnameable" };
declare const identity: Identity;

// @ts-expect-error an actor this project cannot name has no scope to act in
scopeOf(unnameable);

// @ts-expect-error nor can one be built before the unnameable case is ruled out
scopeOf(identity);

declare const asked: AuthorisedWork[];
declare const askedHandle: AuthorisedHandle;

export const theQueueTakesWhatTheAskProduced = async (): Promise<void> => {
  await runner.enqueue(asked);
  await runner.stop?.([askedHandle]);
  await runner.run?.(askedHandle);
};

/**
 * A runner written before the brand existed still satisfies the interface: TypeScript compares
 * method parameters bivariantly, so declaring the wider type is not a break for an implementer.
 */
export const aRunnerFromBefore: Pick<TaskRunner, "enqueue" | "stop" | "run"> = {
  enqueue: async (tasks: TaskInput[]) => {
    void tasks;
    return [];
  },
  stop: async (ids: string[]) => {
    void ids;
  },
  run: async (id: string) => {
    void id;
    return { success: false, error: "not_found" } as const;
  },
};
