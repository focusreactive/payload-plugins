import {
  abortWorkflow,
  fireWorkflowAction,
  getWorkflowHistory,
  getWorkflowState,
  listWorkflowInstances,
  startWorkflow,
} from "@focus-reactive/payload-plugin-workflows";
import { createLocalReq, handleEndpoints } from "payload";
import type { Access, Payload, Plugin, TypedUser, Where } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// The widget's data function (not part of the package's API): from the same built module the
// package entry uses.
import { workflowBoards } from "../../../../../packages/payload-plugin-workflows/dist/server/queries.js";
import { BASE_WORKFLOWS, bootWorkflowsPayload } from "./bootWorkflowsPayload";
import type { WorkflowsTestPayload } from "./bootWorkflowsPayload";

// `visibility`: who sees which workflows is decided by a fact kept on the runs (here a tenant, as
// a multi-tenant host has it), with an ordinary access rule over it. Pages carry a tenant; a user
// belongs to one tenant and reads only its pages (a per-document rule, as plugin-multi-tenant's
// `getTenantAccess` writes it); "super" users read everything.

const RUNS = "workflow-instances";
const EVENTS = "workflow-events";

/** A relationship as a user or document holds it: an id, or the populated document. */
const idOf = (value: unknown): unknown =>
  value && typeof value === "object" ? (value as { id: unknown }).id : value;

const rolesOf = (user: unknown): string[] => (user as { roles?: string[] } | null)?.roles ?? [];

/** The tenant rule, written like plugin-multi-tenant's `getTenantAccess`: `{ tenant: { in } }`. */
const tenantRule = (user: unknown): boolean | Where => {
  if (!user) {
    return false;
  }
  if (rolesOf(user).includes("super")) {
    return true;
  }
  const tenant = idOf((user as { tenant?: unknown }).tenant);
  return { tenant: { in: tenant === undefined || tenant === null ? [] : [tenant] } };
};

const tenancy: Plugin = (config) => ({
  ...config,
  collections: (config.collections ?? []).map((collection) => {
    if (collection.slug === "users") {
      return {
        ...collection,
        fields: [
          ...collection.fields,
          { name: "tenant", type: "relationship", relationTo: "tenants" },
        ],
      };
    }
    if (collection.slug !== "pages") {
      return collection;
    }
    return {
      ...collection,
      fields: [
        ...collection.fields,
        { name: "tenant", type: "relationship", relationTo: "tenants", index: true },
      ],
      access: {
        ...collection.access,
        read: (({ req }) =>
          rolesOf(req.user).includes("no-pages") ? false : tenantRule(req.user)) as Access,
      },
    };
  }),
});

let booted: WorkflowsTestPayload;
let payload: Payload;
let alice: TypedUser;
let bob: TypedUser;
let root: TypedUser;
let outsider: TypedUser;
let tenantA: string | number;
let tenantB: string | number;
const pages: Record<string, string | number> = {};
const runs: Record<string, string> = {};
const tokens: Record<string, string> = {};

const createUser = async (email: string, roles: string[], tenant?: string | number) => {
  const doc = await payload.create({
    collection: "users",
    data: { email, password: "test-password-1", roles, ...(tenant ? { tenant } : {}) } as never,
    overrideAccess: true,
  });
  const login = await payload.login({
    collection: "users",
    data: { email, password: "test-password-1" },
  });
  tokens[email] = login.token as string;
  return { ...doc, collection: "users" } as unknown as TypedUser;
};

const createPage = async (title: string, tenant: string | number) => {
  const page = await payload.create({
    collection: "pages",
    data: { title, tenant } as never,
    draft: true,
    overrideAccess: true,
  });
  pages[title] = page.id;
  return page;
};

const start = async (title: string) => {
  const view = await startWorkflow(payload, {
    workflow: "review",
    collection: "pages",
    id: pages[title] as string | number,
    user: root,
  });
  runs[title] = view.id as string;
  return view.id as string;
};

const readAs = async (collection: string, user: TypedUser, where?: Where) =>
  (
    await payload.find({
      collection: collection as never,
      overrideAccess: false,
      user,
      pagination: false,
      depth: 0,
      ...(where ? { where } : {}),
    })
  ).docs as unknown as { id: string | number; run?: string | number; tenant?: unknown }[];

const countAs = async (collection: string, user: TypedUser) =>
  (await payload.count({ collection: collection as never, overrideAccess: false, user })).totalDocs;

const findByIdAs = (collection: string, id: string | number, user: TypedUser) =>
  payload
    .findByID({ collection: collection as never, id, overrideAccess: false, user, depth: 0 })
    .then((doc) => String(doc.id))
    .catch((error: { status?: number }) => error.status);

/** The run ids `user` lists through the plugin's list function, sorted. */
const listed = async (user: TypedUser) =>
  (await listWorkflowInstances(payload, { scope: "all", user, limit: 100 })).docs
    .map((doc) => doc.id)
    .sort();

const rest = async (who: string, path: string) => {
  const response = await handleEndpoints({
    config: payload.config,
    request: new Request(`http://localhost/api${path}`, {
      headers: { authorization: `JWT ${tokens[who]}` },
    }),
  });
  return { status: response.status, body: await response.json() };
};

const ids = (values: string[]) => [...values].sort();

/** While set, `visibility.fromDocument` throws (a host lookup that fails). */
let broken = false;
const NOT_UPDATED = /^The document was not saved: its workflow visibility could not be updated/u;

beforeAll(async () => {
  booted = await bootWorkflowsPayload({
    workflows: BASE_WORKFLOWS,
    collections: [{ slug: "tenants", fields: [{ name: "name", type: "text" }] }],
    plugins: [tenancy],
    visibility: {
      fields: [{ name: "tenant", type: "relationship", relationTo: "tenants", index: true }],
      fromDocument: ({ doc }) => {
        if (broken) {
          throw new Error("tenant lookup failed");
        }
        return { tenant: doc.tenant };
      },
      read: ({ req }) => tenantRule(req.user),
    },
  });
  payload = booted.payload;
  tenantA = (await payload.create({ collection: "tenants" as never, data: { name: "A" } as never }))
    .id;
  tenantB = (await payload.create({ collection: "tenants" as never, data: { name: "B" } as never }))
    .id;
  alice = await createUser("alice@a.test", ["editor"], tenantA);
  bob = await createUser("bob@b.test", ["editor"], tenantB);
  root = await createUser("root@test.local", ["super", "editor"]);
  // May see every tenant, but may not read pages at all: the collection check still applies.
  outsider = await createUser("outsider@test.local", ["super", "no-pages"]);
  await createPage("A one", tenantA);
  await createPage("A two", tenantA);
  await createPage("B one", tenantB);
  for (const title of ["A one", "A two", "B one"]) {
    const id = await start(title);
    await fireWorkflowAction(payload, { instanceId: id, action: "submit", user: root });
  }
});

afterAll(async () => {
  await booted?.cleanup();
});

afterEach(() => {
  broken = false;
  vi.restoreAllMocks();
});

describe("visibility: each tenant sees only its own workflows", () => {
  it("is written on the run when it starts", async () => {
    const row = await payload.findByID({
      collection: RUNS as never,
      id: runs["A one"] as string,
      depth: 0,
      overrideAccess: true,
    });
    expect(String(idOf((row as { tenant?: unknown }).tenant))).toBe(String(tenantA));
  });

  it("the plugin's lists and the widget's boards", async () => {
    expect(await listed(alice)).toEqual(ids([runs["A one"], runs["A two"]] as string[]));
    expect(await listed(bob)).toEqual([runs["B one"]]);
    expect(await listed(root)).toEqual(ids(Object.values(runs)));
    expect(await listed(outsider)).toEqual([]);
    const mine = await listWorkflowInstances(payload, { scope: "mine", user: alice });
    expect(mine.docs.every((doc) => doc.subject.title?.startsWith("A"))).toBe(true);
    expect(mine).not.toHaveProperty("hiddenCollections");
    const boards = async (user: TypedUser) => {
      const req = await createLocalReq({ user }, payload);
      const result = await workflowBoards(payload, {
        user,
        req,
        boards: 5,
        cards: 3,
        stuckTitle: "Stuck",
      });
      return result.boards.flatMap((board) => board.columns.map((column) => column.count));
    };
    // `review` columns: drafting, review.
    expect(await boards(alice)).toEqual([0, 2]);
    expect(await boards(bob)).toEqual([0, 1]);
  });

  it("the document's state and history", async () => {
    const state = await getWorkflowState(payload, {
      collection: "pages",
      id: pages["A one"] as string | number,
      user: alice,
    });
    expect(state.instances.map((run) => run.id)).toEqual([runs["A one"]]);
    // Bob cannot read the page: the operation refuses before any run is read.
    expect(
      await getWorkflowState(payload, {
        collection: "pages",
        id: pages["A one"] as string | number,
        user: bob,
      }).catch((error: { code?: string }) => error.code)
    ).toBe("unknown-subject");
    expect(
      (await getWorkflowHistory(payload, { instanceId: runs["A one"] as string, user: alice }))
        .entries.length
    ).toBeGreaterThan(0);
    expect(
      await getWorkflowHistory(payload, { instanceId: runs["A one"] as string, user: bob }).catch(
        (error: { code?: string }) => error.code
      )
    ).toBe("unknown-instance");
  });

  it("the runs collection: find, count and findByID with the user's access", async () => {
    expect(ids((await readAs(RUNS, alice)).map((doc) => String(doc.id)))).toEqual(
      ids([runs["A one"], runs["A two"]] as string[])
    );
    expect(await countAs(RUNS, alice)).toBe(2);
    expect(await countAs(RUNS, bob)).toBe(1);
    expect(await countAs(RUNS, outsider)).toBe(0);
    expect(await findByIdAs(RUNS, runs["A one"] as string, alice)).toBe(runs["A one"]);
    expect(await findByIdAs(RUNS, runs["A one"] as string, bob)).toBe(404);
    // A filter of the caller's own cannot widen it.
    const asked = await readAs(RUNS, bob, { id: { in: Object.values(runs) } });
    expect(asked.map((doc) => String(doc.id))).toEqual([runs["B one"]]);
  });

  it("the events collection follows its run: find, count, findByID", async () => {
    const all = await payload.find({
      collection: EVENTS as never,
      overrideAccess: true,
      pagination: false,
      depth: 0,
    });
    const ofRun = (title: string) =>
      all.docs.filter((doc) => String((doc as { run?: unknown }).run) === runs[title]);
    const aliceEvents = await readAs(EVENTS, alice);
    expect(ids(aliceEvents.map((doc) => String(doc.id)))).toEqual(
      ids([...ofRun("A one"), ...ofRun("A two")].map((doc) => String(doc.id)))
    );
    expect(await countAs(EVENTS, alice)).toBe(aliceEvents.length);
    expect(await countAs(EVENTS, bob)).toBe(ofRun("B one").length);
    expect(await countAs(EVENTS, outsider)).toBe(0);
    const foreign = ofRun("B one")[0]?.id as string | number;
    expect(await findByIdAs(EVENTS, foreign, alice)).toBe(404);
    expect(await findByIdAs(EVENTS, foreign, bob)).toBe(String(foreign));
    // An event answers with its run's id; the run is never populated.
    expect(typeof aliceEvents[0]?.run === "object").toBe(false);
  });

  it("REST: the runs and events lists answer each tenant with its own", async () => {
    const runsOfAlice = await rest("alice@a.test", `/${RUNS}?limit=100`);
    expect(runsOfAlice.status).toBe(200);
    expect(runsOfAlice.body.totalDocs).toBe(2);
    const eventsOfBob = await rest("bob@b.test", `/${EVENTS}?limit=100`);
    expect(eventsOfBob.status).toBe(200);
    expect(
      eventsOfBob.body.docs.every((doc: { run: unknown }) => String(doc.run) === runs["B one"])
    ).toBe(true);
    const one = await rest("alice@a.test", `/${RUNS}/${runs["B one"]}`);
    expect(one.status).toBe(404);
  });

  it("more than 5,000 readable documents is no problem: nothing is resolved per document", async () => {
    // Pages straight into the table: alice may read every one of them.
    const db = payload.db as unknown as {
      drizzle: { insert: (table: unknown) => { values: (rows: unknown[]) => Promise<unknown> } };
      tables: Record<string, unknown>;
    };
    const now = new Date().toISOString();
    for (let chunk = 0; chunk < 11; chunk += 1) {
      const rows = Array.from({ length: 500 }, (_, i) => ({
        title: `Bulk ${chunk * 500 + i}`,
        tenant: tenantA,
        _status: "draft",
        createdAt: now,
        updatedAt: now,
      }));
      await db.drizzle.insert(db.tables.pages).values(rows);
    }
    expect(
      (await payload.count({ collection: "pages", overrideAccess: false, user: alice })).totalDocs
    ).toBeGreaterThan(5000);
    const find = vi.spyOn(payload, "find");
    const list = await listWorkflowInstances(payload, { scope: "all", user: alice });
    expect(list.totalDocs).toBe(2);
    expect(list).not.toHaveProperty("hiddenCollections");
    // No query for readable page ids, only the subject titles of the page shown.
    expect(
      find.mock.calls.filter(([args]) => args.collection === "pages" && args.limit === 5001)
    ).toHaveLength(0);
  });

  it("a save that changes nothing it depends on writes nothing more", async () => {
    const updateMany = vi.spyOn(payload.db, "updateMany");
    const find = vi.spyOn(payload, "find");
    const findByID = vi.spyOn(payload, "findByID");
    await payload.update({
      collection: "pages",
      id: pages["A one"] as string | number,
      data: { title: "A one" } as never,
      draft: true,
      overrideAccess: true,
    });
    expect(updateMany.mock.calls.filter(([args]) => args.collection === RUNS)).toHaveLength(0);
    // The hooks' lookups of the document's active runs (guards before, settle after), as
    // without `visibility`.
    expect(find.mock.calls.filter(([args]) => args.collection === RUNS)).toHaveLength(2);
    expect(findByID.mock.calls.filter(([args]) => args.collection === "pages")).toHaveLength(0);
  });

  it("follows the document when its tenant changes: every run of it, finished ones too", async () => {
    // "A two" gets a finished run beside its active one.
    await abortWorkflow(payload, { instanceId: runs["A two"] as string, user: root });
    const finished = runs["A two"] as string;
    const active = await start("A two");
    const updateMany = vi.spyOn(payload.db, "updateMany");
    await payload.update({
      collection: "pages",
      id: pages["A two"] as string | number,
      data: { tenant: tenantB } as never,
      draft: true,
      overrideAccess: true,
    });
    expect(updateMany.mock.calls.filter(([args]) => args.collection === RUNS)).toHaveLength(1);
    expect(await listed(alice)).toEqual([runs["A one"]]);
    expect(await listed(bob)).toEqual(ids([runs["B one"], finished, active] as string[]));
    expect(await findByIdAs(RUNS, finished, bob)).toBe(finished);
    const eventsOfBob = await readAs(EVENTS, bob);
    expect(new Set(eventsOfBob.map((doc) => String(doc.run)))).toEqual(
      new Set([runs["B one"], finished, active])
    );
    expect((await readAs(EVENTS, alice)).every((doc) => String(doc.run) === runs["A one"])).toBe(
      true
    );
  });
});

describe("visibility that cannot be updated fails the save or the start", () => {
  const tenantOfPage = async (id: string | number) =>
    String(
      idOf(
        (
          (await payload.findByID({
            collection: "pages",
            id,
            draft: true,
            depth: 0,
            overrideAccess: true,
          })) as { tenant?: unknown }
        ).tenant
      )
    );
  const tenantsOfRuns = async (id: string | number) =>
    (
      await payload.find({
        collection: RUNS as never,
        where: { subjectId: { equals: String(id) } },
        depth: 0,
        pagination: false,
        overrideAccess: true,
      })
    ).docs.map((row) => String(idOf((row as { tenant?: unknown }).tenant)));
  const moveTo = (id: string | number, tenant: string | number, title?: string) =>
    payload
      .update({
        collection: "pages",
        id,
        data: { tenant, ...(title ? { title } : {}) } as never,
        draft: true,
        overrideAccess: true,
      })
      .then(() => "saved")
      .catch((error: { status?: number; message?: string }) => ({
        status: error.status,
        message: error.message,
      }));
  const notUpdated = { status: 500, message: expect.stringMatching(NOT_UPDATED) };

  it("fromDocument throws on a save of a document with runs: the save fails, nothing changes", async () => {
    const page = await createPage("Throws on save", tenantA);
    const finished = await start("Throws on save");
    await abortWorkflow(payload, { instanceId: finished, user: root });
    await start("Throws on save");
    broken = true;
    expect(await moveTo(page.id, tenantB, "Moved")).toEqual(notUpdated);
    // A save that keeps the tenant cannot be told apart: it fails too.
    expect(await moveTo(page.id, tenantA, "Renamed")).toEqual(notUpdated);
    broken = false;
    expect(await tenantOfPage(page.id)).toBe(String(tenantA));
    const row = (await payload.findByID({
      collection: "pages",
      id: page.id,
      draft: true,
      overrideAccess: true,
    })) as { title?: string };
    expect(row.title).toBe("Throws on save");
    expect(await tenantsOfRuns(page.id)).toEqual([String(tenantA), String(tenantA)]);
    // Once it works again, the move goes through and the runs follow.
    expect(await moveTo(page.id, tenantB)).toBe("saved");
    expect(await tenantsOfRuns(page.id)).toEqual([String(tenantB), String(tenantB)]);
  });

  it("the write of the new values fails: the save fails, nothing changes", async () => {
    const page = await createPage("Write fails", tenantA);
    await start("Write fails");
    const original = payload.db.updateMany.bind(payload.db);
    vi.spyOn(payload.db, "updateMany").mockImplementation((args) =>
      args.collection === RUNS ? Promise.reject(new Error("disk full")) : original(args)
    );
    expect(await moveTo(page.id, tenantB)).toEqual(notUpdated);
    vi.restoreAllMocks();
    expect(await tenantOfPage(page.id)).toBe(String(tenantA));
    expect(await tenantsOfRuns(page.id)).toEqual([String(tenantA)]);
  });

  it("a document without runs saves even if fromDocument throws", async () => {
    const page = await createPage("No runs", tenantA);
    broken = true;
    expect(await moveTo(page.id, tenantB)).toBe("saved");
    broken = false;
    expect(await tenantOfPage(page.id)).toBe(String(tenantB));
  });

  it("fromDocument throws at start: the start fails and no run is created", async () => {
    const page = await createPage("Throws on start", tenantA);
    broken = true;
    const failed = await startWorkflow(payload, {
      workflow: "review",
      collection: "pages",
      id: page.id,
      user: root,
    }).catch((error: { message?: string }) => error.message);
    expect(failed).toBe(
      'Could not start "review": the document\'s workflow visibility could not be computed (visibility.fromDocument threw). No run was created.'
    );
    // The auto-start on create: the document is saved, without a run.
    const auto = await payload.create({
      collection: "pages",
      data: { title: "Auto", tenant: tenantA } as never,
      draft: true,
      overrideAccess: true,
    });
    broken = false;
    expect(await tenantsOfRuns(page.id)).toEqual([]);
    expect(await tenantsOfRuns(auto.id)).toEqual([]);
  });

  it("a run started while the document moves gets the new values", async () => {
    const page = await createPage("Moves during start", tenantA);
    // The move commits right after the start read the document, before its run is inserted, so
    // the move's own sync cannot see the run.
    const findByID = payload.findByID.bind(payload);
    let moved = false;
    vi.spyOn(payload, "findByID").mockImplementation(async (args) => {
      const doc = await findByID(args as never);
      if (!moved && (args.collection as string) === "pages") {
        moved = true;
        // A whole save, committed on its own (no run yet for its sync to move).
        await payload.update({
          collection: "pages",
          id: page.id,
          data: { tenant: tenantB } as never,
          draft: true,
          overrideAccess: true,
        });
      }
      return doc as never;
    });
    await start("Moves during start");
    vi.restoreAllMocks();
    expect(await tenantsOfRuns(page.id)).toEqual([String(tenantB)]);
  });
});
