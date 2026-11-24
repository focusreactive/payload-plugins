import {
  WorkflowError,
  abortWorkflow,
  fireWorkflowAction,
  getWorkflowState,
  listWorkflowInstances,
  startWorkflow,
} from "@focus-reactive/payload-plugin-workflows";
import type { Payload, TypedUser } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { editorialReview } from "../../workflows/editorialReview";
import { bootWorkflowsPayload, timer } from "./bootWorkflowsPayload";
import type { WorkflowsTestPayload } from "./bootWorkflowsPayload";

// The demo's editorial review: the author owns drafting and never reviews their own page; who may
// stop a run follows the hold; "For me" lists what the reader can pick up.

let booted: WorkflowsTestPayload;
let payload: Payload;
let ann: TypedUser;
let bea: TypedUser;
let cat: TypedUser;

const createUser = async (email: string, roles: string[] = []): Promise<TypedUser> => {
  const doc = await payload.create({
    collection: "users",
    data: { email, password: "test-password-1", roles } as never,
    overrideAccess: true,
  });
  return { ...doc, collection: "users" } as unknown as TypedUser;
};

const createPage = async (title: string) =>
  payload.create({
    collection: "pages",
    data: { title } as never,
    draft: true,
    overrideAccess: true,
  });

const refusal = async (run: Promise<unknown>): Promise<WorkflowError | undefined> => {
  try {
    await run;
  } catch (error) {
    if (error instanceof WorkflowError) {
      return error;
    }
    throw error;
  }
  return undefined;
};

const allowed = (view: Awaited<ReturnType<typeof startWorkflow>>) =>
  view.activities.flatMap((activity) =>
    activity.actions.filter((action) => action.allowed).map((action) => action.name)
  );

/** A page in review: Ann wrote it and submitted it. */
const inReview = async (title: string) => {
  const page = await createPage(title);
  const started = await startWorkflow(payload, {
    workflow: "editorial-review",
    collection: "pages",
    id: page.id,
    user: ann,
  });
  const id = started.id as string;
  await fireWorkflowAction(payload, { instanceId: id, action: "submit", user: ann });
  return { page, id };
};

beforeAll(async () => {
  booted = await bootWorkflowsPayload({ workflows: [editorialReview, timer] });
  payload = booted.payload;
  ann = await createUser("ann@test.local");
  bea = await createUser("bea@test.local");
  cat = await createUser("cat@test.local");
});

afterAll(async () => {
  await booted?.cleanup();
});

describe("ownership: the author drafts, someone else reviews", () => {
  it("holds whoever started the run as the author; drafting waits on them alone", async () => {
    const page = await createPage("Owned");
    const started = await startWorkflow(payload, {
      workflow: "editorial-review",
      collection: "pages",
      id: page.id,
      user: ann,
    });
    expect(started.fields.author).toBe(String(ann.id));
    expect(started.waitingOn).toEqual({ users: [String(ann.id)], roles: [] });
    const asBea = await getWorkflowState(payload, { collection: "pages", id: page.id, user: bea });
    expect(allowed(asBea.instances[0] as never)).toEqual([]);
    const code = (
      await refusal(
        fireWorkflowAction(payload, {
          instanceId: started.id as string,
          action: "submit",
          user: bea,
        })
      )
    )?.code;
    expect(code).toBe("not-allowed");
  });

  it("in review the author can neither take, approve nor reject; anyone else can", async () => {
    const { page, id } = await inReview("Own review");
    const asAnn = await getWorkflowState(payload, { collection: "pages", id: page.id, user: ann });
    expect(allowed(asAnn.instances[0] as never)).toEqual([]);
    for (const action of ["claim", "approve"]) {
      expect(
        (await refusal(fireWorkflowAction(payload, { instanceId: id, action, user: ann })))?.code
      ).toBe("not-allowed");
    }
    const asBea = await getWorkflowState(payload, { collection: "pages", id: page.id, user: bea });
    expect(allowed(asBea.instances[0] as never)).toEqual(["claim", "approve", "reject"]);
  });
});

describe("stopping is not a way around a hold", () => {
  it("the author cannot stop a review held by another reviewer; the reviewer can", async () => {
    const { page, id } = await inReview("Held");
    await fireWorkflowAction(payload, { instanceId: id, action: "claim", user: bea });
    const asAnn = await getWorkflowState(payload, { collection: "pages", id: page.id, user: ann });
    expect(asAnn.instances[0]?.canAbort).toBe(false);
    const refused = await refusal(abortWorkflow(payload, { instanceId: id, user: ann }));
    expect(refused?.code).toBe("not-allowed");
    expect(refused?.message).toMatch(
      /^Publishing is on hold\. .*Only someone who can act in “Review”/u
    );
    // Someone else who may not act either is refused the same way.
    expect((await refusal(abortWorkflow(payload, { instanceId: id, user: cat })))?.code).toBe(
      "not-allowed"
    );

    const asBea = await getWorkflowState(payload, { collection: "pages", id: page.id, user: bea });
    expect(asBea.instances[0]?.canAbort).toBe(true);
    const stopped = await abortWorkflow(payload, {
      instanceId: id,
      reason: "Duplicate",
      user: bea,
    });
    expect(stopped.status).toBe("aborted");
    expect(stopped.history.at(-1)).toMatchObject({ type: "aborted", reason: "Duplicate" });
  });

  it("anyone may stop a run in a stage without guards", async () => {
    const page = await createPage("No guard");
    const started = await startWorkflow(payload, {
      workflow: "timer",
      collection: "pages",
      id: page.id,
      user: ann,
    });
    const asCat = await getWorkflowState(payload, { collection: "pages", id: page.id, user: cat });
    expect(asCat.instances[0]?.canAbort).toBe(true);
    const stopped = await abortWorkflow(payload, { instanceId: started.id as string, user: cat });
    expect(stopped.status).toBe("aborted");
  });

  it("drafting holds nothing, so anyone may stop it, not just the author", async () => {
    const page = await createPage("Drafting stop");
    const started = await startWorkflow(payload, {
      workflow: "editorial-review",
      collection: "pages",
      id: page.id,
      user: ann,
    });
    const stopped = await abortWorkflow(payload, { instanceId: started.id as string, user: bea });
    expect(stopped.status).toBe("aborted");
  });
});

describe("For me lists what I can pick up", () => {
  it("runs waiting on me first, then runs open to anyone, never finished or someone else's", async () => {
    const mine = await createPage("Waits on Cat");
    const open = await createPage("Open");
    const others = await createPage("Waits on Ann");
    // Cat drafts her own page: it waits on her by name.
    const catRun = await startWorkflow(payload, {
      workflow: "editorial-review",
      collection: "pages",
      id: mine.id,
      user: cat,
    });
    // A timer run waits on no one: open to anyone.
    const openRun = await startWorkflow(payload, {
      workflow: "timer",
      collection: "pages",
      id: open.id,
      user: ann,
    });
    // Ann's draft waits on Ann alone.
    const annRun = await startWorkflow(payload, {
      workflow: "editorial-review",
      collection: "pages",
      id: others.id,
      user: ann,
    });

    const forCat = await listWorkflowInstances(payload, {
      scope: "mine",
      status: "active",
      user: cat,
    });
    const ids = forCat.docs.map((doc) => doc.id);
    expect(ids).toContain(catRun.id);
    expect(ids).toContain(openRun.id);
    expect(ids).not.toContain(annRun.id);
    expect(ids.indexOf(catRun.id as string)).toBeLessThan(ids.indexOf(openRun.id as string));
    const flags = Object.fromEntries(forCat.docs.map((doc) => [doc.id, doc.waitsOnYou]));
    expect(flags[catRun.id as string]).toBe(true);
    expect(flags[openRun.id as string]).toBe(false);
    // Every run waiting on Cat comes before every open one.
    const firstOpen = forCat.docs.findIndex((doc) => !doc.waitsOnYou);
    expect(forCat.docs.slice(firstOpen).every((doc) => !doc.waitsOnYou)).toBe(true);

    // A finished run waits on no one but is not something to pick up.
    await abortWorkflow(payload, { instanceId: openRun.id as string, user: ann });
    const after = await listWorkflowInstances(payload, { scope: "mine", user: cat });
    expect(after.docs.map((doc) => doc.id)).not.toContain(openRun.id);
  });
});
