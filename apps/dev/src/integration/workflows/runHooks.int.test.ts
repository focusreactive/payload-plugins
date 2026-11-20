import { startWorkflow } from "@focus-reactive/payload-plugin-workflows";
import type { TypedUser } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootWorkflowsPayload } from "./bootWorkflowsPayload";
import type { WorkflowsTestPayload } from "./bootWorkflowsPayload";

// Regression: with `jobs.runHooks: true` (the scheduling plugin sets it) Payload 3.90's
// `jobs.runByID` claims a job and never runs it, so effects stayed queued forever. Found by driving
// the dev app, which has the scheduling plugin installed.
let booted: WorkflowsTestPayload;

beforeAll(async () => {
  booted = await bootWorkflowsPayload({ jobs: { runHooks: true } });
});

afterAll(async () => {
  await booted?.cleanup();
});

describe("workflows with jobs.runHooks", () => {
  it("still runs effects inline right after the commit", async () => {
    const { payload } = booted;
    const user = await payload.create({
      collection: "users",
      data: { email: "hooks@test.local", password: "test-password-1" } as never,
      overrideAccess: true,
    });
    const page = await payload.create({
      collection: "pages",
      data: { title: "Hooked" } as never,
      draft: true,
      overrideAccess: true,
    });
    const view = await startWorkflow(payload, {
      workflow: "ai-check",
      collection: "pages",
      id: page.id,
      user: { ...user, collection: "users" } as unknown as TypedUser,
    });
    expect(view.status).toBe("completed");
    expect(
      view.history.filter((entry) => entry.type === "effect").map((entry) => entry.status)
    ).toEqual(["queued", "done"]);
  });
});
