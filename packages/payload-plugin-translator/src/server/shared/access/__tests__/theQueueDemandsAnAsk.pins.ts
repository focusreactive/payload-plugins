/** Never imported and never run: `check-types` fails if any `@ts-expect-error` below stops being an error. */

import type { TaskRunner } from "../../../modules/task-runner/TaskRunner.interface.js";
import type { TaskInput } from "../../../modules/task-runner/types.js";
import type { AuthorisedHandle, AuthorisedWork } from "../authorised.js";

declare const runner: TaskRunner;
declare const work: TaskInput[];
declare const handle: string;

// @ts-expect-error work reaches the queue only once the rules have been asked about its document
runner.enqueue(work);

// @ts-expect-error a job is cancelled only once the rules have been asked about its document
runner.cancel([handle]);

// @ts-expect-error and run, likewise
runner.run(handle);

declare const asked: AuthorisedWork[];
declare const askedHandle: AuthorisedHandle;

// the positive control: what the ask produced is what the queue takes
runner.enqueue(asked);
runner.cancel([askedHandle]);
runner.run(askedHandle);

/**
 * A runner written before the brand existed still satisfies the interface: TypeScript compares
 * method parameters bivariantly, so declaring the wider type is not a break for an implementer.
 */
export const aRunnerFromBefore: Pick<TaskRunner, "enqueue" | "cancel" | "run"> = {
  enqueue: async (tasks: TaskInput[]) => {
    void tasks;
  },
  cancel: async (ids: string[]) => {
    void ids;
  },
  run: async (id: string) => {
    void id;
    return { success: false, error: "not_found" } as const;
  },
};
