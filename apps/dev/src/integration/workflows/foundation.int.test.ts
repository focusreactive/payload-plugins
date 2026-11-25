import {
  abortWorkflow,
  defineWorkflow,
  fireWorkflowAction,
  getWorkflowHistory,
  getWorkflowState,
  listWorkflowInstances,
  startWorkflow,
  tickWorkflows,
} from "@focus-reactive/payload-plugin-workflows";
import type { InstanceView } from "@focus-reactive/payload-plugin-workflows";
import { commitTransaction, createLocalReq, handleEndpoints, initTransaction } from "payload";
import type { Access, Payload, Plugin, TypedUser } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { aiCheck, bootWorkflowsPayload, review, timer } from "./bootWorkflowsPayload";
import type { WorkflowsTestPayload } from "./bootWorkflowsPayload";

// The foundation pass: guards on create, numeric assignees, stale effect results, endpoints on the
// runs collection, the caller's request in reads, and reads that stay bounded as runs pile up.

const SLUG = "workflow-instances";

/** Auto-starts on a page titled "Held…" in a stage that holds publishing. */
const heldOnCreate = defineWorkflow({
  name: "held-on-create",
  collections: ["pages"],
  start: {
    on: "create",
    when: ({ doc }) => typeof doc.title === "string" && doc.title.startsWith("Held"),
  },
  initialStage: "review",
  stages: [
    {
      name: "review",
      guards: [
        {
          name: "hold",
          title: "A reviewer must approve this page first.",
          operations: ["publish"],
        },
      ],
      actions: [{ name: "approve", status: "done" }],
      transitions: [{ name: "ok", to: "done" }],
    },
    { name: "done" },
  ],
});

/** The reviewer is a real (numeric on SQL) user id, seeded at start; `note` is a start field. */
let ownerId: string | number | undefined;
const owned = defineWorkflow({
  name: "owned",
  collections: ["pages"],
  initialStage: "review",
  fields: [
    { name: "reviewer", type: "user", initialValue: () => ownerId },
    { name: "note", type: "string", input: true },
  ],
  stages: [
    {
      name: "review",
      assignee: "reviewer",
      roles: ["editor"],
      actions: [{ name: "approve", status: "done" }],
      transitions: [{ name: "t", to: "done" }],
    },
    { name: "done" },
  ],
});

/** `check` queues `llm-check`, whose `{ set: { verdict: "pass" } }` passes the review. */
const checked = defineWorkflow({
  name: "checked",
  collections: ["pages"],
  initialStage: "drafting",
  fields: [{ name: "verdict", type: "string" }],
  stages: [
    {
      name: "drafting",
      actions: [{ name: "submit", status: "done" }],
      transitions: [{ name: "to-review", to: "review" }],
    },
    {
      name: "review",
      actions: [
        { name: "check", effects: ["llm-check"] },
        { name: "reject", status: "done" },
      ],
      transitions: [
        { name: "pass", to: "passed", when: ({ fields }) => fields.verdict === "pass" },
        { name: "back", to: "drafting" },
      ],
    },
    { name: "passed" },
  ],
});

/**
 * A host collection named `workflows` (whose `/api/workflows/*` Payload routes to it), and a
 * tenant rule on pages that reads a header: a "tenant" user reads pages only with `x-tenant: acme`.
 */
const host: Plugin = (config) => ({
  ...config,
  collections: [
    ...(config.collections ?? []).map((collection) => {
      if (collection.slug !== "pages") {
        return collection;
      }
      const read = collection.access?.read as Access;
      return {
        ...collection,
        access: {
          ...collection.access,
          read: (args: Parameters<Access>[0]) =>
            ((args.req.user as { roles?: string[] } | null)?.roles ?? []).includes("tenant")
              ? args.req.headers?.get("x-tenant") === "acme"
              : read(args),
        },
      };
    }),
    { slug: "workflows", fields: [{ name: "title", type: "text" }] },
  ],
});

let booted: WorkflowsTestPayload;
let payload: Payload;
let editor: TypedUser;
let other: TypedUser;
let blind: TypedUser;
let noPages: TypedUser;
let tenant: TypedUser;
let count = 0;

const createUser = async (email: string, roles: string[]): Promise<TypedUser> => {
  const doc = await payload.create({
    collection: "users",
    data: { email, password: "test-password-1", roles } as never,
    overrideAccess: true,
  });
  return { ...doc, collection: "users" } as unknown as TypedUser;
};

const createPage = (title = `Page ${(count += 1)}`) =>
  payload.create({
    collection: "pages",
    data: { title } as never,
    draft: true,
    overrideAccess: true,
  });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runRow = async (id: string) =>
  (await payload.findByID({
    collection: SLUG as never,
    id,
    depth: 0,
    overrideAccess: true,
  })) as unknown as {
    stage: string;
    status: string;
    fields: Record<string, unknown>;
    history: { type: string; effect?: string; status?: string; stale?: boolean }[];
  };

const tokens: Record<string, string> = {};
/** A REST call through Payload's own HTTP handler, as the admin's fetch makes it. */
const rest = async (
  who: string,
  path: string,
  options: { body?: unknown; headers?: Record<string, string> } = {}
) => {
  const response = await handleEndpoints({
    config: payload.config,
    request: new Request(`http://localhost/api${path}`, {
      method: options.body === undefined ? "GET" : "POST",
      headers: {
        authorization: `JWT ${tokens[who]}`,
        "content-type": "application/json",
        ...options.headers,
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    }),
  });
  return { status: response.status, body: await response.json() };
};

const login = async (name: string, email: string) => {
  const result = await payload.login({
    collection: "users",
    data: { email, password: "test-password-1" },
  });
  tokens[name] = result.token as string;
};

beforeAll(async () => {
  booted = await bootWorkflowsPayload({
    workflows: [review, aiCheck, timer, heldOnCreate, owned, checked],
    plugins: [host],
  });
  payload = booted.payload;
  editor = await createUser("editor@test.local", ["editor"]);
  other = await createUser("other@test.local", ["editor"]);
  blind = await createUser("blind@test.local", ["editor", "blind"]);
  noPages = await createUser("no-pages@test.local", ["editor", "no-pages"]);
  tenant = await createUser("tenant@test.local", ["editor", "tenant"]);
  await login("editor", "editor@test.local");
  await login("tenant", "tenant@test.local");
});

afterAll(async () => {
  await booted?.cleanup();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the tick (first: no other runs yet)", () => {
  it("looks only at runs in a stage that can move on its own, reading documents per collection", async () => {
    const waiting = await createPage();
    await startWorkflow(payload, {
      workflow: "timer",
      collection: "pages",
      id: waiting.id,
      user: editor,
    });
    const drafting = await createPage();
    // `drafting` has no automatic action and no transition `when`: only a write moves it.
    await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: drafting.id,
      user: editor,
    });
    const findByID = vi.spyOn(payload, "findByID");
    const find = vi.spyOn(payload, "find");
    const result = await tickWorkflows(payload);
    expect(result).toEqual({ checked: 1, advanced: 0 });
    expect(findByID.mock.calls.filter(([args]) => args.collection === "pages")).toHaveLength(0);
    expect(find.mock.calls.filter(([args]) => args.collection === "pages")).toHaveLength(1);
  });
});

describe("guards on create (a run that starts on create)", () => {
  it("refuses creating the document published while the first stage holds publishing", async () => {
    const before = (await payload.count({ collection: "pages", overrideAccess: true })).totalDocs;
    const refused = await payload
      .create({
        collection: "pages",
        data: { title: "Held published", _status: "published" } as never,
        overrideAccess: true,
      })
      .catch((error: { status?: number; message?: string }) => error);
    expect(refused).toMatchObject({
      status: 403,
      message: "Publishing is on hold. A reviewer must approve this page first.",
    });
    expect((await payload.count({ collection: "pages", overrideAccess: true })).totalDocs).toBe(
      before
    );
    expect(
      (
        await payload.count({
          collection: SLUG as never,
          where: { workflow: { equals: "held-on-create" } },
          overrideAccess: true,
        })
      ).totalDocs
    ).toBe(0);
  });

  it("lets a draft be created, and the run starts holding it", async () => {
    const page = await createPage("Held draft");
    const state = await getWorkflowState(payload, {
      collection: "pages",
      id: page.id,
      user: editor,
    });
    expect(state.instances.map((run) => [run.workflow, run.stage.name])).toEqual([
      ["held-on-create", "review"],
    ]);
    // A page whose title does not start it is not held.
    const free = await payload.create({
      collection: "pages",
      data: { title: "Free", _status: "published" } as never,
      overrideAccess: true,
    });
    expect(free.id).toBeDefined();
  });
});

describe("a numeric user id holds the assignment", () => {
  it("only the held reviewer may act, even when start fields are passed too", async () => {
    ownerId = editor.id;
    const page = await createPage();
    const view = await startWorkflow(payload, {
      workflow: "owned",
      collection: "pages",
      id: page.id,
      fields: { note: "please" },
      user: editor,
    });
    expect(view.fields).toMatchObject({ reviewer: String(editor.id), note: "please" });
    expect(view.waitingOn).toEqual({ users: [String(editor.id)], roles: [] });
    const refused = await fireWorkflowAction(payload, {
      instanceId: view.id as string,
      action: "approve",
      user: other,
    }).catch((error: { code?: string }) => error.code);
    expect(refused).toBe("not-allowed");
    const mine = async (user: TypedUser) =>
      (await listWorkflowInstances(payload, { scope: "mine", workflow: "owned", user })).docs.map(
        (doc) => doc.id
      );
    expect(await mine(editor)).toEqual([view.id]);
    expect(await mine(other)).toEqual([]);
    const done = await fireWorkflowAction(payload, {
      instanceId: view.id as string,
      action: "approve",
      user: editor,
    });
    expect(done.status).toBe("completed");
  });
});

describe("an effect's `{ set }` lands only in the stage visit that queued it", () => {
  /** Fires `check` in a caller's transaction, so its effect job waits for the runner. */
  const queueCheck = async (id: string) => {
    const req = await createLocalReq({ user: editor }, payload);
    await initTransaction(req);
    await fireWorkflowAction(payload, { instanceId: id, action: "check", user: editor, req });
    await commitTransaction(req);
  };
  const inReview = async () => {
    const page = await createPage();
    const view = await startWorkflow(payload, {
      workflow: "checked",
      collection: "pages",
      id: page.id,
      user: editor,
    });
    await fireWorkflowAction(payload, {
      instanceId: view.id as string,
      action: "submit",
      user: editor,
    });
    return view.id as string;
  };
  const runQueue = () => payload.jobs.run({ queue: "workflows-plugin", sequential: true });

  it("applies it while the run is still there", async () => {
    const id = await inReview();
    await queueCheck(id);
    await runQueue();
    expect((await runRow(id)).stage).toBe("passed");
  });

  it("ignores it after the run was sent back before the effect ran", async () => {
    const id = await inReview();
    await queueCheck(id);
    await fireWorkflowAction(payload, { instanceId: id, action: "reject", user: editor });
    await runQueue();
    const row = await runRow(id);
    expect(row.stage).toBe("drafting");
    expect(row.fields.verdict).toBeUndefined();
    expect(row.history.at(-1)).toMatchObject({
      type: "effect",
      effect: "llm-check",
      status: "done",
      stale: true,
    });
  });

  it("ignores it when it arrives after the run looped back into the same stage", async () => {
    const id = await inReview();
    await queueCheck(id);
    await fireWorkflowAction(payload, { instanceId: id, action: "reject", user: editor });
    await fireWorkflowAction(payload, { instanceId: id, action: "submit", user: editor });
    await runQueue();
    const row = await runRow(id);
    expect(row.stage).toBe("review");
    expect(row.fields.verdict).toBeUndefined();
    expect(row.history.at(-1)).toMatchObject({ stale: true });
  });
});

describe("the REST endpoints live on the runs collection", () => {
  it("start, fire, state and history work beside a host collection named `workflows`", async () => {
    const page = await createPage();
    const started = await rest("editor", "/workflow-instances/start", {
      body: { workflow: "checked", collection: "pages", id: page.id },
    });
    expect(started.status).toBe(200);
    const fired = await rest("editor", "/workflow-instances/fire", {
      body: { instanceId: started.body.id, action: "submit" },
    });
    expect(fired).toMatchObject({ status: 200, body: { stage: { name: "review" } } });
    const state = await rest("editor", `/workflow-instances/state?collection=pages&id=${page.id}`);
    expect(state.status).toBe(200);
    expect(state.body.instances.map((run: InstanceView) => run.id)).toEqual([started.body.id]);
    const history = await rest(
      "editor",
      `/workflow-instances/history?instanceId=${started.body.id}`
    );
    expect(history.status).toBe(200);
    expect(history.body.entries.map((entry: { type: string }) => entry.type)).toEqual(
      state.body.instances[0].history.map((entry: { type: string }) => entry.type)
    );
    // The host's own collection still answers its own routes.
    expect((await rest("editor", "/workflows")).body).toMatchObject({ totalDocs: 0 });
  });
});

describe("reads use the caller's request", () => {
  it("a host rule reading a request header sees the caller's headers", async () => {
    const page = await createPage();
    const view = await startWorkflow(payload, {
      workflow: "checked",
      collection: "pages",
      id: page.id,
      user: editor,
    });
    const url = `/workflow-instances/state?collection=pages&id=${page.id}`;
    const withHeader = await rest("tenant", url, { headers: { "x-tenant": "acme" } });
    expect(withHeader.status).toBe(200);
    expect(withHeader.body.instances.map((run: InstanceView) => run.id)).toEqual([view.id]);
    expect((await rest("tenant", url)).status).toBe(404);

    const req = await createLocalReq({ user: tenant }, payload);
    req.headers = new Headers({ "x-tenant": "acme" });
    const listed = await listWorkflowInstances(payload, {
      scope: "all",
      workflow: "checked",
      user: tenant,
      req,
    });
    expect(listed.docs.map((doc) => doc.id)).toContain(view.id);
    // Without the caller's request: a fresh one, no header, nothing readable.
    expect(
      (await listWorkflowInstances(payload, { scope: "all", workflow: "checked", user: tenant }))
        .totalDocs
    ).toBe(0);
  });
});

describe("lists are paginated, sorted and counted in the database", () => {
  const ids: Record<string, string> = {};
  beforeAll(async () => {
    // Review runs only in this block. Every third page is "Secret" (unreadable to `blind`); every
    // other run is submitted, so it waits on the role `editor` instead of being open to anyone.
    for (let i = 0; i < 14; i += 1) {
      const title = i % 3 === 0 ? "Secret" : `Listed ${i}`;
      const page = await createPage(title);
      const view = await startWorkflow(payload, {
        workflow: "review",
        collection: "pages",
        id: page.id,
        user: editor,
      });
      if (i % 2 === 0) {
        await fireWorkflowAction(payload, {
          instanceId: view.id as string,
          action: "submit",
          user: editor,
        });
      }
      ids[`${i}`] = view.id as string;
      await sleep(3);
    }
  });

  const pages = async (args: Parameters<typeof listWorkflowInstances>[1], size: number) => {
    const first = await listWorkflowInstances(payload, { ...args, page: 1, limit: size });
    const docs = [...first.docs];
    for (let page = 2; page <= first.totalPages; page += 1) {
      docs.push(...(await listWorkflowInstances(payload, { ...args, page, limit: size })).docs);
    }
    return { totalDocs: first.totalDocs, ids: docs.map((doc) => doc.id), docs };
  };

  it("pages through every run newest first; deep pages and totals agree", async () => {
    const whole = await listWorkflowInstances(payload, {
      scope: "all",
      workflow: "review",
      user: editor,
      limit: 100,
    });
    // One run from the tick test plus the 14 here.
    expect(whole.totalDocs).toBe(15);
    const updated = whole.docs.map((doc) => doc.updatedAt);
    expect(updated).toEqual([...updated].sort().reverse());
    const paged = await pages({ scope: "all", workflow: "review", user: editor }, 4);
    expect(paged.totalDocs).toBe(15);
    expect(paged.ids).toEqual(whole.docs.map((doc) => doc.id));
  });

  it("never returns or counts a run on a document the caller cannot read", async () => {
    const whole = await listWorkflowInstances(payload, {
      scope: "all",
      workflow: "review",
      user: editor,
      limit: 100,
    });
    const readable = whole.docs
      .filter((doc) => doc.subject.title !== "Secret")
      .map((doc) => doc.id);
    // A per-document rule (`blind` may not read "Secret" pages).
    const forBlind = await pages({ scope: "all", workflow: "review", user: blind }, 3);
    expect(forBlind.totalDocs).toBe(readable.length);
    expect(forBlind.ids).toEqual(readable);
    const mineBlind = await pages({ scope: "mine", workflow: "review", user: blind }, 3);
    expect(mineBlind.docs.some((doc) => doc.subject.title === "Secret")).toBe(false);
    // No access to the collection at all.
    for (const scope of ["all", "mine"] as const) {
      const none = await listWorkflowInstances(payload, { scope, user: noPages });
      expect(none).toMatchObject({ totalDocs: 0, docs: [] });
    }
  });

  it("`mine`: what waits on you first, then what is open to anyone, across pages", async () => {
    const whole = await listWorkflowInstances(payload, {
      scope: "mine",
      workflow: "review",
      user: editor,
      limit: 100,
    });
    const flags = whole.docs.map((doc) => doc.waitsOnYou);
    expect(flags).toEqual([...flags].sort().reverse());
    expect(flags.filter(Boolean)).toHaveLength(7);
    expect(flags.filter((flag) => !flag)).toHaveLength(8);
    const paged = await pages({ scope: "mine", workflow: "review", user: editor }, 4);
    expect(paged.totalDocs).toBe(15);
    expect(paged.ids).toEqual(whole.docs.map((doc) => doc.id));
  });

  it("resolves the runs' read access once per request", async () => {
    const find = vi.spyOn(payload, "find");
    const req = await createLocalReq({ user: blind }, payload);
    await listWorkflowInstances(payload, { scope: "mine", user: blind, req });
    // The per-document rule is resolved with one id query on pages, not one per runs query.
    const resolved = find.mock.calls.filter(
      ([args]) => args.collection === "pages" && args.limit === 5001
    );
    expect(resolved).toHaveLength(1);
  });

  it("says when runs are hidden because the caller may read too many documents", async () => {
    const find = payload.find.bind(payload);
    vi.spyOn(payload, "find").mockImplementation((async (args: Parameters<Payload["find"]>[0]) =>
      args.collection === "pages" && args.limit === 5001
        ? { docs: Array.from({ length: 5001 }, (_, id) => ({ id })) }
        : find(args)) as Payload["find"]);
    const listed = await listWorkflowInstances(payload, { scope: "all", user: blind });
    expect(listed).toMatchObject({ totalDocs: 0, hiddenCollections: ["pages"] });
    const page = await payload.find({
      collection: "pages",
      where: { title: { equals: "Listed 1" } },
      overrideAccess: true,
    });
    const state = await getWorkflowState(payload, {
      collection: "pages",
      id: page.docs[0]?.id as number,
      user: blind,
    });
    expect(state).toMatchObject({ instances: [], hiddenCollections: ["pages"] });
    // A caller under the cap is told nothing.
    expect(await listWorkflowInstances(payload, { scope: "all", user: editor })).not.toHaveProperty(
      "hiddenCollections"
    );
  });
});

describe("the drawer's state stays small", () => {
  it("has the active runs and the latest finished one, and caps history (older on demand)", async () => {
    const page = await createPage();
    const finished: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const view = await startWorkflow(payload, {
        workflow: "review",
        collection: "pages",
        id: page.id,
        user: editor,
      });
      await abortWorkflow(payload, { instanceId: view.id as string, user: editor });
      finished.push(view.id as string);
      await sleep(3);
    }
    const active = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: editor,
    });
    const id = active.id as string;
    await fireWorkflowAction(payload, { instanceId: id, action: "submit", user: editor });
    await fireWorkflowAction(payload, { instanceId: id, action: "claim", user: editor });
    for (let i = 0; i < 12; i += 1) {
      await fireWorkflowAction(payload, {
        instanceId: id,
        action: "reject",
        params: { reason: `round ${i}` },
        user: editor,
      });
      await fireWorkflowAction(payload, { instanceId: id, action: "submit", user: editor });
    }
    const state = await getWorkflowState(payload, {
      collection: "pages",
      id: page.id,
      user: editor,
    });
    expect(state.instances.map((run) => run.id)).toEqual([id, finished.at(-1)]);
    const [view] = state.instances;
    const total = (await runRow(id)).history.length;
    expect(view?.history).toHaveLength(50);
    expect(view?.olderHistory).toBe(total - 50);
    expect(view?.started).toMatchObject({ actor: { id: String(editor.id) } });
    const older = await getWorkflowHistory(payload, {
      instanceId: id,
      before: view?.olderHistory,
      user: editor,
    });
    expect(older.older).toBe(Math.max(0, total - 100));
    expect([...older.entries, ...(view?.history ?? [])]).toEqual(
      (await runRow(id)).history.slice(older.older)
    );
    // Only someone who may read the run.
    expect(
      await getWorkflowHistory(payload, { instanceId: id, user: noPages }).catch(
        (error: { code?: string }) => error.code
      )
    ).toBe("unknown-instance");
  });

  it("a fire reads the run once and writes it with one conditional update", async () => {
    const page = await createPage();
    const view = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: editor,
    });
    const findByID = vi.spyOn(payload, "findByID");
    const updateOne = vi.spyOn(payload.db, "updateOne");
    await fireWorkflowAction(payload, {
      instanceId: view.id as string,
      action: "submit",
      user: editor,
    });
    expect(findByID.mock.calls.filter(([args]) => args.collection === SLUG)).toHaveLength(1);
    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(updateOne.mock.calls[0]?.[0]).toMatchObject({ options: { atomic: true } });
  });
});
