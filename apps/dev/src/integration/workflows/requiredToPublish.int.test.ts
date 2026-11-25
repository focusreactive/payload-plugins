import {
  WORKFLOW_BYPASS,
  abortWorkflow,
  defineWorkflow,
  fireWorkflowAction,
  getWorkflowState,
  startWorkflow,
} from "@focus-reactive/payload-plugin-workflows";
import { workflowAgentTools } from "@focus-reactive/payload-plugin-workflows/agent";
import type { Payload, TypedUser } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootWorkflowsPayload, historyOf } from "./bootWorkflowsPayload";
import type { WorkflowsTestPayload } from "./bootWorkflowsPayload";

// `requiredToPublish`: every publish of a covered document needs a completed run of the workflow
// that no publish has used yet; the publish uses it.

const NOTES = "notes";
const BRIEFS = "briefs";

const approval = (name: string, title: string, collections: string[]) =>
  defineWorkflow({
    name,
    title,
    collections,
    requiredToPublish: true,
    initialStage: "review",
    stages: [
      {
        name: "review",
        actions: [{ name: "approve", status: "done" }],
        transitions: [{ name: "approved", to: "approved" }],
      },
      { name: "approved", title: "Approved" },
    ],
  });

const signoff = approval("signoff", "Sign-off", [NOTES, BRIEFS]);
const legal = approval("legal", "Legal review", [BRIEFS]);

const NONE = "Publishing requires a completed Sign-off. Start it from the Workflow button.";
const RUNNING = "Publishing requires a completed Sign-off; it is in progress.";
const USED = "This version was approved and published; changes need a new Sign-off.";

let booted: WorkflowsTestPayload;
let payload: Payload;
let editor: TypedUser;

const drafts = (slug: string) => ({
  slug,
  versions: { drafts: true },
  trash: true,
  fields: [{ name: "title", type: "text" as const }],
});

const createDraft = (collection: string, title: string) =>
  payload.create({
    collection: collection as never,
    data: { title } as never,
    draft: true,
    overrideAccess: true,
  });

const publish = (collection: string, id: string | number, extra: Record<string, unknown> = {}) =>
  payload
    .update({
      collection: collection as never,
      id,
      data: { _status: "published" } as never,
      overrideAccess: true,
      user: editor,
      ...extra,
    })
    .then(() => "published")
    .catch((error: { status?: number; message?: string }) => ({
      status: error.status,
      message: error.message,
    }));

const saveDraft = (collection: string, id: string | number, title: string) =>
  payload
    .update({
      collection: collection as never,
      id,
      data: { title } as never,
      draft: true,
      overrideAccess: true,
    })
    .then(() => "saved");

/** Starts `workflow` on the document and, unless `open`, approves it (completed). */
const approved = async (
  workflow: string,
  collection: string,
  id: string | number,
  open = false
) => {
  const run = await startWorkflow(payload, { workflow, collection, id, user: editor });
  if (open) {
    return run.id as string;
  }
  await fireWorkflowAction(payload, {
    instanceId: run.id as string,
    action: "approve",
    user: editor,
  });
  return run.id as string;
};

const refused = (message: string) => ({ status: 403, message });

beforeAll(async () => {
  booted = await bootWorkflowsPayload({
    workflows: [signoff, legal],
    collections: [drafts(NOTES), drafts(BRIEFS)],
  });
  payload = booted.payload;
  const doc = await payload.create({
    collection: "users",
    data: { email: "editor@publish.test", password: "test-password-1" } as never,
    overrideAccess: true,
  });
  editor = { ...doc, collection: "users" } as unknown as TypedUser;
});

afterAll(async () => {
  await booted?.cleanup();
});

describe("requiredToPublish", () => {
  it("refuses a publish with no run, with a run in progress, and with a stopped run", async () => {
    const note = await createDraft(NOTES, "Note");
    expect(await publish(NOTES, note.id)).toEqual(refused(NONE));
    const running = await approved("signoff", NOTES, note.id, true);
    expect(await publish(NOTES, note.id)).toEqual(refused(RUNNING));
    await abortWorkflow(payload, { instanceId: running, user: editor });
    expect(await publish(NOTES, note.id)).toEqual(refused(NONE));
  });

  it("never refuses a draft save, an unpublish, a trash or a delete", async () => {
    const note = await createDraft(NOTES, "Drafts");
    expect(await saveDraft(NOTES, note.id, "Still a draft")).toBe("saved");
    await approved("signoff", NOTES, note.id, true);
    expect(await saveDraft(NOTES, note.id, "In review")).toBe("saved");
    const autosave = await payload.update({
      collection: NOTES as never,
      id: note.id,
      data: { title: "Autosaved" } as never,
      draft: true,
      autosave: true,
      overrideAccess: true,
    });
    expect(autosave.id).toBe(note.id);
    // Published once (with an approval), then unpublished: no approval needed.
    const live = await createDraft(NOTES, "Live");
    await approved("signoff", NOTES, live.id);
    expect(await publish(NOTES, live.id)).toBe("published");
    const unpublished = await payload.update({
      collection: NOTES as never,
      id: live.id,
      data: { _status: "draft" } as never,
      overrideAccess: true,
    });
    expect((unpublished as { _status?: string })._status).toBe("draft");
    await payload.update({
      collection: NOTES as never,
      id: live.id,
      data: { deletedAt: new Date().toISOString() } as never,
      overrideAccess: true,
    });
    await payload.delete({
      collection: NOTES as never,
      id: live.id,
      trash: true,
      overrideAccess: true,
    });
    await payload.delete({ collection: NOTES as never, id: note.id, overrideAccess: true });
  });

  it("refuses creating a document already published", async () => {
    const created = await payload
      .create({
        collection: NOTES as never,
        data: { title: "Born published", _status: "published" } as never,
        overrideAccess: true,
      })
      .catch((error: { status?: number; message?: string }) => ({
        status: error.status,
        message: error.message,
      }));
    expect(created).toEqual(refused(NONE));
    // A copy of a published document is created published: refused too, unless made a draft
    // (as the admin's Duplicate does).
    const source = await createDraft(NOTES, "Source");
    expect(await publish(NOTES, source.id, { context: { [WORKFLOW_BYPASS]: true } })).toBe(
      "published"
    );
    const copy = await payload
      .duplicate({ collection: NOTES as never, id: source.id, overrideAccess: true })
      .catch((error: { status?: number; message?: string }) => ({
        status: error.status,
        message: error.message,
      }));
    expect(copy).toEqual(refused(NONE));
    const draftCopy = await payload.duplicate({
      collection: NOTES as never,
      id: source.id,
      data: { _status: "draft" } as never,
      overrideAccess: true,
    });
    expect((draftCopy as { _status?: string })._status).toBe("draft");
  });

  it("lets one publish through per completed run, and records it on the run", async () => {
    const note = await createDraft(NOTES, "Once");
    const run = await approved("signoff", NOTES, note.id);
    const before = await getWorkflowState(payload, {
      collection: NOTES,
      id: note.id,
      user: editor,
    });
    expect(before.publish).toEqual({ clear: true });
    expect(before.instances[0]).toMatchObject({ requiredToPublish: true });
    expect(before.instances[0]).not.toHaveProperty("publishedAt");

    expect(await publish(NOTES, note.id)).toBe("published");
    const row = await payload.findByID({
      collection: "workflow-instances" as never,
      id: run,
      overrideAccess: true,
    });
    expect((row as { publishedAt?: string }).publishedAt).toEqual(expect.any(String));
    expect((await historyOf(payload, run)).at(-1)).toMatchObject({
      type: "published",
      stage: "approved",
      actorId: String(editor.id),
    });
    const after = await getWorkflowState(payload, { collection: NOTES, id: note.id, user: editor });
    expect(after.publish).toEqual({ clear: false, reason: USED });
    expect(after.instances[0]?.publishedAt).toEqual(expect.any(String));

    // A plain (non-draft) save of the published document writes it live: it needs a new run, as
    // does the next publish.
    expect(
      await payload
        .update({
          collection: NOTES as never,
          id: note.id,
          data: { title: "Live edit" } as never,
          overrideAccess: true,
        })
        .catch((error: { message?: string }) => error.message)
    ).toBe(USED);
    await saveDraft(NOTES, note.id, "Changed");
    expect(await publish(NOTES, note.id)).toEqual(refused(USED));
    const plain = await payload.update({
      collection: NOTES as never,
      id: note.id,
      data: { title: "Plain over a draft" } as never,
      overrideAccess: true,
    });
    // Over a newer draft, Payload writes a plain save as a draft: not a publish, not refused.
    expect((plain as { _status?: string })._status).toBe("draft");
    await approved("signoff", NOTES, note.id);
    expect(await publish(NOTES, note.id)).toBe("published");
  });

  it("the bypass flag lets a refused publish through and records it on the latest run", async () => {
    const note = await createDraft(NOTES, "Bypassed");
    const run = await approved("signoff", NOTES, note.id, true);
    expect(await publish(NOTES, note.id, { context: { [WORKFLOW_BYPASS]: true } })).toBe(
      "published"
    );
    expect((await historyOf(payload, run)).at(-1)).toMatchObject({
      type: "guard-bypassed",
      operation: "publish",
      guards: ["requiredToPublish"],
      actorId: String(editor.id),
    });
    // With no run at all, nothing to record it on: it goes through.
    const bare = await createDraft(NOTES, "Bare");
    expect(await publish(NOTES, bare.id, { context: { [WORKFLOW_BYPASS]: true } })).toBe(
      "published"
    );
  });

  it("with two required workflows, both must be completed, and both are used", async () => {
    const brief = await createDraft(BRIEFS, "Brief");
    const first = await approved("signoff", BRIEFS, brief.id);
    expect(await publish(BRIEFS, brief.id)).toEqual(
      refused("Publishing requires a completed Legal review. Start it from the Workflow button.")
    );
    const second = await approved("legal", BRIEFS, brief.id);
    expect(await publish(BRIEFS, brief.id)).toBe("published");
    for (const run of [first, second]) {
      expect((await historyOf(payload, run)).at(-1)?.type).toBe("published");
    }
    expect(await publish(BRIEFS, brief.id)).toEqual(refused(USED));
  });

  it("agents read it from the document's state", async () => {
    const note = await createDraft(NOTES, "Agent");
    const tools = workflowAgentTools({ payload, user: editor });
    const state = (await tools.workflows_get_state.execute({
      collectionSlug: NOTES,
      documentId: String(note.id),
    })) as { publish?: unknown; available: { name: string; requiredToPublish?: boolean }[] };
    expect(state.publish).toEqual({ clear: false, reason: NONE });
    expect(state.available).toContainEqual(
      expect.objectContaining({ name: "signoff", requiredToPublish: true })
    );
  });
});
