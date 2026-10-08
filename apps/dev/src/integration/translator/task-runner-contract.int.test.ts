import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll } from "vitest";

import { assertTaskRunnerContract } from "../../../../../packages/payload-plugin-translator/src/server/modules/task-runner/__tests__/TaskRunner.invariants";
import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

let ctx: TestPayload;

beforeAll(async () => {
  ctx = await bootTestPayload({ runner: createPayloadJobsRunner({ autoRun: false }) });
});
afterAll(async () => {
  await ctx?.cleanup();
});

assertTaskRunnerContract("PayloadJobsTaskRunner", () =>
  createPayloadJobsRunner({ autoRun: false }).create(ctx.payload, async () => undefined)
);
