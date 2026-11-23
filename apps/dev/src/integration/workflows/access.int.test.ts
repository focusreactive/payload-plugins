import {
  WorkflowError,
  abortWorkflow,
  fireWorkflowAction,
  getWorkflowState,
  startWorkflow,
} from "@focus-reactive/payload-plugin-workflows";
import type { WorkflowAccessArgs } from "@focus-reactive/payload-plugin-workflows";
import { createLocalReq } from "payload";
import type { Payload, TypedUser } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootWorkflowsPayload } from "./bootWorkflowsPayload";
import type { WorkflowsTestPayload } from "./bootWorkflowsPayload";

// Per-document access rules: the callbacks get the user the operation acts for (not `req.user`),
// the workflow, and the subject document read with that user's access.
const calls: { op: string; args: WorkflowAccessArgs }[] = [];
const roles = (user: TypedUser) => ((user as { roles?: string[] }).roles ?? []) as string[];

let booted: WorkflowsTestPayload;
let payload: Payload;
let author: TypedUser;
let starter: TypedUser;
let aborter: TypedUser;

const createUser = async (email: string, userRoles: string[]): Promise<TypedUser> => {
  const doc = await payload.create({
    collection: "users",
    data: { email, password: "test-password-1", roles: userRoles } as never,
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

const codeOf = async (run: Promise<unknown>): Promise<string | undefined> => {
  try {
    await run;
  } catch (error) {
    if (error instanceof WorkflowError) {
      return error.code;
    }
    throw error;
  }
  return undefined;
};

beforeAll(async () => {
  booted = await bootWorkflowsPayload({
    access: {
      start: (args) => {
        calls.push({ op: "start", args });
        return roles(args.user).includes("starter") && args.doc?.title !== "No start";
      },
      fire: (args) => {
        calls.push({ op: "fire", args });
        return args.doc?.title !== "Frozen";
      },
      abort: (args) => {
        calls.push({ op: "abort", args });
        return roles(args.user).includes("aborter");
      },
    },
  });
  payload = booted.payload;
  author = await createUser("author@test.local", []);
  starter = await createUser("starter@test.local", ["starter"]);
  aborter = await createUser("aborter@test.local", ["starter", "aborter"]);
});

afterAll(async () => {
  await booted?.cleanup();
});

describe("access options", () => {
  it("start: called with { req, user, workflow, collection, id, doc }, per document", async () => {
    const page = await createPage("Yes start");
    calls.length = 0;
    const view = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: starter,
    });
    const args = calls.find((call) => call.op === "start")?.args;
    expect(args?.user.id).toBe(starter.id);
    expect(args?.workflow.name).toBe("review");
    expect(args?.collection).toBe("pages");
    expect(args?.id).toBe(String(page.id));
    expect(args?.doc?.title).toBe("Yes start");
    expect(args?.req).toBeDefined();
    // canAbort is computed for the same user.
    expect(view.canAbort).toBe(false);

    const refused = await createPage("No start");
    expect(
      await codeOf(
        startWorkflow(payload, {
          workflow: "review",
          collection: "pages",
          id: refused.id,
          user: starter,
        })
      )
    ).toBe("not-allowed");
    const state = await getWorkflowState(payload, {
      collection: "pages",
      id: refused.id,
      user: starter,
    });
    expect(state.available).toEqual([]);
    expect(
      (
        await getWorkflowState(payload, { collection: "pages", id: page.id, user: starter })
      ).available.map((entry) => entry.name)
    ).toEqual(["ai-check", "auto-start"]);
  });

  it("checks the user passed in, never a different req.user", async () => {
    const page = await createPage("Who");
    const reqAsStarter = await createLocalReq({ user: starter }, payload);
    // The request belongs to a starter, but the operation acts for the author: refused.
    expect(
      await codeOf(
        startWorkflow(payload, {
          workflow: "review",
          collection: "pages",
          id: page.id,
          user: author,
          req: reqAsStarter,
        })
      )
    ).toBe("not-allowed");
    const reqAsAuthor = await createLocalReq({ user: author }, payload);
    const view = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: aborter,
      req: reqAsAuthor,
    });
    expect(view.canAbort).toBe(true);
    const fired = await fireWorkflowAction(payload, {
      instanceId: view.id as string,
      action: "submit",
      user: starter,
      req: await createLocalReq({ user: aborter }, payload),
    });
    expect(fired.canAbort).toBe(false);
  });

  it("fire: a per-document rule refuses; abort: only who the rule allows", async () => {
    const page = await createPage("Thaw");
    const run = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: starter,
    });
    const instanceId = run.id as string;
    await payload.update({
      collection: "pages",
      id: page.id,
      data: { title: "Frozen" } as never,
      draft: true,
      overrideAccess: true,
    });
    calls.length = 0;
    expect(
      await codeOf(
        fireWorkflowAction(payload, {
          instanceId,
          action: "submit",
          user: starter,
        })
      )
    ).toBe("not-allowed");
    const fire = calls.find((call) => call.op === "fire")?.args;
    expect(fire?.doc?.title).toBe("Frozen");
    expect(fire?.id).toBe(String(page.id));

    expect(await codeOf(abortWorkflow(payload, { instanceId, user: starter }))).toBe("not-allowed");
    const state = await getWorkflowState(payload, {
      collection: "pages",
      id: page.id,
      user: aborter,
    });
    expect(state.instances[0]?.canAbort).toBe(true);
    expect(
      (await getWorkflowState(payload, { collection: "pages", id: page.id, user: starter }))
        .instances[0]?.canAbort
    ).toBe(false);
    expect((await abortWorkflow(payload, { instanceId, user: aborter })).status).toBe("aborted");
  });
});
