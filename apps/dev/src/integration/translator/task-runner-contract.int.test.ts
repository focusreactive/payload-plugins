import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { assertTaskRunnerContract } from "@focus-reactive/payload-plugin-translator/testing";
import { afterAll, beforeAll, vi } from "vitest";
import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

let ctx: TestPayload;

beforeAll(async () => {
  ctx = await bootTestPayload({ runner: createPayloadJobsRunner({ autoRun: false }) });
});
afterAll(async () => {
  await ctx?.cleanup();
});

const provider = createPayloadJobsRunner({ autoRun: false });

assertTaskRunnerContract(
  "PayloadJobsTaskRunner",
  (report) =>
    provider.create(ctx.payload, {
      handler: vi.fn().mockResolvedValue(undefined),
      report,
    }),
  provider.capabilities
);
