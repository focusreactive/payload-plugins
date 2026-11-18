import type { Payload } from "payload";
import { vi } from "vitest";

import { assertTaskRunnerContract } from "../../../../../testing/index.js";
import { SyncRunnerProvider } from "../SyncRunnerProvider.js";

const provider = new SyncRunnerProvider();

assertTaskRunnerContract(
  "SyncTaskRunner",
  (report) =>
    provider.create({} as Payload, {
      handler: vi.fn().mockResolvedValue(undefined),
      report,
    }),
  provider.capabilities
);
