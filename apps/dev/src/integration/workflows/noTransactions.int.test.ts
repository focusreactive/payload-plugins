import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { BASE_WORKFLOWS, bootWorkflowsPayload, onSave } from "./bootWorkflowsPayload";
import type { WorkflowsTestPayload } from "./bootWorkflowsPayload";

// SQLite's default: no database transactions. A save's hooks then run after its writes are final,
// so the effects they queue run inline right away, with no jobs runner.
let booted: WorkflowsTestPayload;

beforeAll(async () => {
  booted = await bootWorkflowsPayload({
    transactions: false,
    workflows: [...BASE_WORKFLOWS, onSave],
  });
});

afterAll(async () => {
  await booted?.cleanup();
});

const statusOf = async (pageId: number | string) =>
  (
    (
      await booted.payload.find({
        collection: "workflow-instances" as never,
        where: {
          and: [{ subjectId: { equals: String(pageId) } }, { workflow: { equals: "on-save" } }],
        },
        overrideAccess: true,
      })
    ).docs[0] as unknown as { status: string } | undefined
  )?.status;

describe("hook-queued effects without transactions", () => {
  it("run inline on create (auto-start) and on a later save (settle)", async () => {
    const { payload } = booted;
    const created = await payload.create({
      collection: "pages",
      data: { title: "Effect go" } as never,
      draft: true,
      overrideAccess: true,
    });
    expect(await statusOf(created.id)).toBe("completed");

    const saved = await payload.create({
      collection: "pages",
      data: { title: "Effect" } as never,
      draft: true,
      overrideAccess: true,
    });
    expect(await statusOf(saved.id)).toBe("active");
    await payload.update({
      collection: "pages",
      id: saved.id,
      data: { title: "Effect go" } as never,
      draft: true,
      overrideAccess: true,
    });
    expect(await statusOf(saved.id)).toBe("completed");
  });
});
