import {
  defineWorkflow,
  fireWorkflowAction,
  getWorkflowState,
  startWorkflow,
} from "@focus-reactive/payload-plugin-workflows";
import type { InstanceView } from "@focus-reactive/payload-plugin-workflows";
import { createLocalReq } from "payload";
import type { Payload, TypedUser } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { bootWorkflowsPayload } from "./bootWorkflowsPayload";
import type { WorkflowsTestPayload } from "./bootWorkflowsPayload";

// One workflow per document, judged in one locale: every condition sees the document in the
// default locale (`en`), whoever saves it in whichever locale.

const ARTICLES = "articles";

const judged = defineWorkflow({
  name: "judged",
  collections: [ARTICLES],
  initialStage: "waiting",
  stages: [
    {
      name: "waiting",
      // Saving is held until the (localized) title is "Open".
      guards: [
        {
          name: "hold",
          title: "Not open yet.",
          operations: ["update"],
          unless: ({ doc }) => doc?.title === "Open" || doc?.title === "Go",
        },
      ],
      actions: [{ name: "approve", status: "done", filter: ({ doc }) => doc?.title === "Open" }],
      transitions: [
        { name: "auto", to: "done", when: ({ doc }) => doc?.title === "Go" },
        { name: "approved", to: "done" },
      ],
    },
    { name: "done" },
  ],
});

const autoStart = defineWorkflow({
  name: "auto-on-title",
  collections: [ARTICLES],
  start: { on: "create", when: ({ doc }) => doc.title === "Auto" },
  initialStage: "open",
  stages: [
    {
      name: "open",
      actions: [{ name: "close", status: "done" }],
      transitions: [{ name: "closed", to: "closed" }],
    },
    { name: "closed" },
  ],
});

let booted: WorkflowsTestPayload;
let payload: Payload;
let editor: TypedUser;

const createArticle = async (title: string, locale = "en") =>
  payload.create({
    collection: ARTICLES as never,
    data: { title } as never,
    locale,
    draft: true,
    overrideAccess: true,
  });

const save = (id: string | number, title: string, locale: string) =>
  payload.update({
    collection: ARTICLES as never,
    id,
    data: { title } as never,
    locale,
    draft: true,
    overrideAccess: true,
  });

const stateIn = async (id: string | number, locale: string) => {
  const req = await createLocalReq({ user: editor, locale }, payload);
  const state = await getWorkflowState(payload, { collection: ARTICLES, id, user: editor, req });
  return state.instances[0] as InstanceView;
};

const approveAllowed = (view: InstanceView) =>
  view.activities[0]?.actions.find((action) => action.name === "approve")?.allowed;

const runsOf = async (id: string | number) =>
  (
    await payload.find({
      collection: "workflow-instances" as never,
      where: { subjectId: { equals: String(id) } },
      overrideAccess: true,
      pagination: false,
    })
  ).docs as unknown as { workflow: string; stage: string; status: string }[];

beforeAll(async () => {
  booted = await bootWorkflowsPayload({
    workflows: [judged, autoStart],
    localization: { locales: ["en", "de"], defaultLocale: "en", fallback: true },
    collections: [
      {
        slug: ARTICLES,
        versions: { drafts: true },
        fields: [{ name: "title", type: "text", localized: true }],
      },
    ],
  });
  payload = booted.payload;
  const doc = await payload.create({
    collection: "users",
    data: { email: "editor@loc.test", password: "test-password-1", roles: ["editor"] } as never,
    overrideAccess: true,
  });
  editor = { ...doc, collection: "users" } as unknown as TypedUser;
});

afterAll(async () => {
  await booted?.cleanup();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("conditions see the document in the default locale", () => {
  it("a save in another locale neither moves the run nor changes what the drawer offers", async () => {
    const article = await createArticle("Draft");
    const run = await startWorkflow(payload, {
      workflow: "judged",
      collection: ARTICLES,
      id: article.id,
      user: editor,
    });
    // "Open" in German only: the guard (on the English title) still holds the save.
    const refused = await save(article.id, "Open", "de").catch(
      (error: { status?: number; message?: string }) => error
    );
    expect(refused).toMatchObject({ status: 403, message: "Saving is on hold. Not open yet." });
    // "Go" in German: the guard lets nothing through either, and nothing moves.
    expect(
      await save(article.id, "Go", "de").catch((error: { status?: number }) => error.status)
    ).toBe(403);
    expect((await runsOf(article.id))[0]?.stage).toBe("waiting");
    // The drawer, read in German, offers what the English document allows: not "approve".
    expect(approveAllowed(await stateIn(article.id, "de"))).toBe(false);
    expect(approveAllowed(await stateIn(article.id, "en"))).toBe(false);
    const req = await createLocalReq({ user: editor, locale: "de" }, payload);
    expect(
      await fireWorkflowAction(payload, {
        instanceId: run.id as string,
        action: "approve",
        user: editor,
        req,
      }).catch((error: { code?: string }) => error.code)
    ).toBe("not-allowed");
    // The request's own locale is left as it was.
    expect(req.locale).toBe("de");
  });

  it("a save in the default locale does move it, and changes what the drawer offers", async () => {
    const article = await createArticle("Draft");
    await startWorkflow(payload, {
      workflow: "judged",
      collection: ARTICLES,
      id: article.id,
      user: editor,
    });
    await save(article.id, "Open", "en");
    expect(approveAllowed(await stateIn(article.id, "de"))).toBe(true);
    await save(article.id, "Go", "en");
    expect((await runsOf(article.id))[0]).toMatchObject({ stage: "done", status: "completed" });
  });

  it("a workflow that starts on create judges `start.when` in the default locale", async () => {
    const german = await createArticle("Auto", "de");
    expect(await runsOf(german.id)).toEqual([]);
    const english = await createArticle("Auto", "en");
    expect((await runsOf(english.id)).map((run) => run.workflow)).toEqual(["auto-on-title"]);
  });

  it("reads the document again only when the save is in another locale", async () => {
    const article = await createArticle("Draft");
    await startWorkflow(payload, {
      workflow: "judged",
      collection: ARTICLES,
      id: article.id,
      user: editor,
    });
    await save(article.id, "Open", "en");
    const findByID = vi.spyOn(payload, "findByID");
    await save(article.id, "Open", "en");
    expect(findByID.mock.calls.filter(([args]) => args.collection === ARTICLES)).toHaveLength(0);
    await save(article.id, "Offen", "de");
    // Once for the guards (before), once for the settle (after).
    expect(
      findByID.mock.calls.filter(([args]) => args.collection === ARTICLES && args.locale === "en")
    ).toHaveLength(2);
  });
});
