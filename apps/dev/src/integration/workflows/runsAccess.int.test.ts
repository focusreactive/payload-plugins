import {
  getWorkflowState,
  listWorkflowInstances,
  startWorkflow,
} from "@focus-reactive/payload-plugin-workflows";
import type { Payload, TypedUser } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootWorkflowsPayload } from "./bootWorkflowsPayload";
import type { WorkflowsTestPayload } from "./bootWorkflowsPayload";

// The runs collection's own `read` access: a run is readable only by someone who may read its
// document, whatever reads it (Payload's list view, REST, GraphQL, the Local API as a user).
const SLUG = "workflow-instances";

let booted: WorkflowsTestPayload;
let payload: Payload;
let editor: TypedUser;
let blind: TypedUser;
let noPages: TypedUser;
const runIds: Record<string, string> = {};

const createUser = async (email: string, roles: string[]): Promise<TypedUser> => {
  const doc = await payload.create({
    collection: "users",
    data: { email, password: "test-password-1", roles } as never,
    overrideAccess: true,
  });
  return { ...doc, collection: "users" } as unknown as TypedUser;
};

/** A page with a review run on it, as the editor. */
const withRun = async (title: string) => {
  const page = await payload.create({
    collection: "pages",
    data: { title } as never,
    draft: true,
    overrideAccess: true,
  });
  const run = await startWorkflow(payload, {
    workflow: "review",
    collection: "pages",
    id: page.id,
    user: editor,
  });
  runIds[title] = String(run.id);
  return page;
};

/** The run ids `user` reads from the runs collection with their access, sorted. */
const visibleTo = async (user: TypedUser): Promise<string[]> =>
  (
    await payload.find({
      collection: SLUG as never,
      overrideAccess: false,
      user,
      pagination: false,
      depth: 0,
    })
  ).docs
    .map((doc) => String(doc.id))
    .sort();

const allRuns = async (): Promise<string[]> =>
  (await payload.find({ collection: SLUG as never, overrideAccess: true, pagination: false })).docs
    .map((doc) => String(doc.id))
    .sort();

const findByIdAs = (id: string, user: TypedUser) =>
  payload
    .findByID({ collection: SLUG as never, id, overrideAccess: false, user, depth: 0 })
    .then((doc) => String(doc.id))
    .catch((error: { status?: number }) => error.status);

beforeAll(async () => {
  booted = await bootWorkflowsPayload();
  payload = booted.payload;
  editor = await createUser("editor@test.local", ["editor"]);
  blind = await createUser("blind@test.local", ["editor", "blind"]);
  noPages = await createUser("no-pages@test.local", ["editor", "no-pages"]);
  await withRun("Open");
  await withRun("Secret");
  // Readable as published, not in its latest draft: the plugin reads the latest draft.
  const later = await withRun("Later");
  await payload.update({
    collection: "pages",
    id: later.id,
    data: { title: "Secret" } as never,
    draft: true,
    overrideAccess: true,
  });
});

afterAll(async () => {
  await booted?.cleanup();
});

describe("the runs collection's read access", () => {
  it("an admin who may read every page sees every run", async () => {
    const all = await allRuns();
    expect(all).toHaveLength(3);
    expect(await visibleTo(editor)).toEqual(all);
    expect(
      await payload.count({ collection: SLUG as never, overrideAccess: false, user: editor })
    ).toMatchObject({ totalDocs: 3 });
    expect(await findByIdAs(runIds.Secret as string, editor)).toBe(runIds.Secret);
  });

  it("a user who cannot read pages at all sees no page runs, and is not refused the list", async () => {
    expect(await visibleTo(noPages)).toEqual([]);
    expect(
      await payload.count({ collection: SLUG as never, overrideAccess: false, user: noPages })
    ).toMatchObject({ totalDocs: 0 });
    expect(await findByIdAs(runIds.Open as string, noPages)).toBe(404);
    const listed = await listWorkflowInstances(payload, { scope: "all", user: noPages });
    expect(listed.totalDocs).toBe(0);
  });

  it("a per-document read rule: only runs on the documents it allows", async () => {
    expect(await visibleTo(blind)).toEqual([runIds.Open]);
    expect(
      await payload.count({ collection: SLUG as never, overrideAccess: false, user: blind })
    ).toMatchObject({ totalDocs: 1 });
    expect(await findByIdAs(runIds.Open as string, blind)).toBe(runIds.Open);
    expect(await findByIdAs(runIds.Secret as string, blind)).toBe(404);
    expect(await findByIdAs(runIds.Later as string, blind)).toBe(404);
    // A filter of the caller's own cannot widen it.
    const asked = await payload.find({
      collection: SLUG as never,
      where: { id: { in: Object.values(runIds) } },
      overrideAccess: false,
      user: blind,
      pagination: false,
    });
    expect(asked.docs.map((doc) => String(doc.id))).toEqual([runIds.Open]);
  });

  it("the plugin's own reads are unchanged: one run each, as before", async () => {
    const forEditor = await listWorkflowInstances(payload, { scope: "all", user: editor });
    expect(forEditor.docs.map((doc) => doc.id).sort()).toEqual(await allRuns());
    const forBlind = await listWorkflowInstances(payload, { scope: "all", user: blind });
    expect(forBlind.docs.map((doc) => doc.id)).toEqual([runIds.Open]);
    expect(forBlind.totalDocs).toBe(1);
    const open = await payload.find({
      collection: "pages",
      where: { title: { equals: "Open" } },
      overrideAccess: true,
    });
    const state = await getWorkflowState(payload, {
      collection: "pages",
      id: open.docs[0]?.id as number | string,
      user: blind,
    });
    expect(state.instances.map((run) => run.id)).toEqual([runIds.Open]);
  });
});
