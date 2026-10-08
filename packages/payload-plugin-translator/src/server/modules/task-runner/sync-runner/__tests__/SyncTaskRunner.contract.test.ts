import type { Payload } from "payload";
import { vi } from "vitest";

import { assertTaskRunnerContract } from "../../__tests__/TaskRunner.invariants.js";
import type { Task } from "../../types.js";
import { LazyMap } from "../../../../shared/utils/index.js";
import { SyncTaskRunner } from "../SyncTaskRunner.js";

assertTaskRunnerContract(
  "SyncTaskRunner",
  () =>
    new SyncTaskRunner(
      {} as Payload,
      vi.fn().mockResolvedValue(undefined),
      new LazyMap<string, Task>({ isRemovable: () => false, getTimestamp: () => 0 })
    )
);
